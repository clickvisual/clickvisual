package alarmai

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func testStore(t *testing.T) (*Store, db.Alarm, db.AlarmFilter, db.BaseTable) {
	t.Helper()
	d, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := d.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := d.AutoMigrate(&db.Alarm{}, &db.AlarmAIGroup{}, &db.AlarmAIAnalysis{}, &db.AlarmAIDelivery{}); err != nil {
		t.Fatal(err)
	}
	a := db.Alarm{Uid: 4, Name: "Errors", Status: db.AlarmStatusFiring, ChannelIds: db.Ints{1, 2}}
	if err := d.Create(&a).Error; err != nil {
		t.Fatal(err)
	}
	f := db.AlarmFilter{Tid: 8, When: "level:error"}
	f.ID = 3
	table := db.BaseTable{Database: &db.BaseDatabase{Iid: 9}}
	table.ID = 8
	s := NewStore(d, 900)
	s.now = func() time.Time { return time.Unix(2000, 0) }
	return s, a, f, table
}

func notice(status string, start, end int64) db.Notification {
	a := db.Alert{Labels: map[string]string{"app": "api", "env": "prod"}, StartsAt: time.Unix(start, 0)}
	if end != 0 {
		a.EndsAt = time.Unix(end, 0)
	}
	return db.Notification{Status: status, Alerts: []db.Alert{a}}
}

func countJobs(t *testing.T, s *Store, want int64) {
	t.Helper()
	var n int64
	s.db.Model(&db.AlarmAIAnalysis{}).Count(&n)
	if n != want {
		t.Fatalf("jobs=%d want %d", n, want)
	}
}

func TestDedupCooldownRecoveryAndStaleReplay(t *testing.T) {
	s, a, f, table := testStore(t)
	enqueue := func(n db.Notification) {
		t.Helper()
		if err := s.Enqueue(context.Background(), a, f, table, n); err != nil {
			t.Fatal(err)
		}
	}
	enqueue(notice("firing", 1900, 0))
	enqueue(notice("firing", 1900, 0))
	countJobs(t, s, 1)
	var job db.AlarmAIAnalysis
	s.db.First(&job)
	if job.EventCount != 2 {
		t.Fatalf("event count %d", job.EventCount)
	}
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		return Result{Summary: "Cause", Snapshot: `{"session":{}}`}, nil
	}, func(context.Context, int, *db.PushMsg) error { return nil }, "https://cv.test/sub/")
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	enqueue(notice("firing", 1900, 0))
	countJobs(t, s, 1)
	enqueue(notice("resolved", 1900, 2050))
	enqueue(notice("firing", 2100, 0))
	countJobs(t, s, 2)
	enqueue(notice("resolved", 1900, 2050))
	enqueue(notice("firing", 1900, 0))
	countJobs(t, s, 2)
	var group db.AlarmAIGroup
	s.db.First(&group)
	if group.ResolvedAt != 0 || group.StartsAt != time.Unix(2100, 0).UnixNano() {
		t.Fatalf("stale resolve changed current incident: %+v", group)
	}
	enqueue(notice("resolved", 2100, 2200))
	enqueue(notice("firing", 2100, 0))
	countJobs(t, s, 2)
}

func TestClaimsRetriesAndFailedChannelsOnly(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	first, ok, err := s.claim(context.Background(), "one")
	if err != nil || !ok {
		t.Fatalf("claim %v %v", ok, err)
	}
	if _, ok, err := s.claim(context.Background(), "two"); err != nil || ok {
		t.Fatalf("duplicate claim %v %v", ok, err)
	}
	s.now = func() time.Time { return time.Unix(2300, 0) }
	second, ok, err := s.claim(context.Background(), "two")
	if err != nil || !ok || first.ID != second.ID {
		t.Fatalf("restart recovery %v %v", ok, err)
	}
	s.db.Model(&second).Updates(map[string]any{"lease_until": 0, "lease_owner": ""})
	analyses := 0
	sends := map[int]int{}
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		analyses++
		return Result{Summary: "password=secret token:abc Bearer xyz", Snapshot: "immutable"}, nil
	}, func(_ context.Context, id int, msg *db.PushMsg) error {
		sends[id]++
		if msg.Title != "【AI 告警分析】Errors" {
			t.Fatalf("unexpected notification title %s", msg.Title)
		}
		if strings.Contains(msg.Text, "secret") || !strings.Contains(msg.Text, "https://cv.test/sub/v2/ask?alertAnalysis=") {
			t.Fatalf("unsafe message %s", msg.Text)
		}
		if id == 2 {
			return errors.New("ambiguous delivery")
		}
		return nil
	}, "https://cv.test/sub/")
	for i := 0; i < 5; i++ {
		if err := w.ProcessOne(context.Background()); err != nil {
			t.Fatal(err)
		}
		current := s.now()
		s.now = func() time.Time { return current.Add(5 * time.Minute) }
	}
	if analyses != 1 || sends[1] != 1 || sends[2] != 3 {
		t.Fatalf("analysis=%d sends=%v", analyses, sends)
	}
	var result db.AlarmAIAnalysis
	s.db.First(&result)
	if result.Snapshot != "immutable" || result.Status != "done" {
		t.Fatalf("result %+v", result)
	}
}

func TestAnalysisRetryCapAndDisabledRule(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	calls := 0
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		calls++
		return Result{}, errors.New("provider failed")
	}, nil, "")
	for i := 0; i < 5; i++ {
		if err := w.ProcessOne(context.Background()); err != nil {
			t.Fatal(err)
		}
		current := s.now()
		s.now = func() time.Time { return current.Add(5 * time.Minute) }
	}
	if calls != 3 {
		t.Fatalf("retry count %d", calls)
	}
	var job db.AlarmAIAnalysis
	s.db.First(&job)
	if job.Status != "failed" {
		t.Fatalf("status %s", job.Status)
	}
	if err := s.Enqueue(context.Background(), a, f, table, notice("resolved", 1900, 4000)); err != nil {
		t.Fatal(err)
	}
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 4100, 0)); err != nil {
		t.Fatal(err)
	}
	s.db.Model(&a).Update("status", db.AlarmStatusClose)
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	if calls != 3 {
		t.Fatal("disabled rule analyzed")
	}
}

func TestRecoveryDuringAnalysisPreventsDelivery(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	sent := false
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		if err := s.Enqueue(context.Background(), a, f, table, notice("resolved", 1900, 1990)); err != nil {
			t.Fatal(err)
		}
		return Result{Summary: "stale", Snapshot: "stale"}, nil
	}, func(context.Context, int, *db.PushMsg) error { sent = true; return nil }, "")
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	if sent {
		t.Fatal("recovered incident delivered stale analysis")
	}
	var job db.AlarmAIAnalysis
	s.db.First(&job)
	if job.Snapshot != "" || job.Status != "cancelled" {
		t.Fatalf("stale job %+v", job)
	}
}

func TestMixedGroupRecoveryAndReplayWatermark(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	n := notice("firing", 1900, 2050)
	n.Alerts[0].Status = "resolved"
	if err := s.Enqueue(context.Background(), a, f, table, n); err != nil {
		t.Fatal(err)
	}
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 2000, 0)); err != nil {
		t.Fatal(err)
	}
	countJobs(t, s, 1)
	var group db.AlarmAIGroup
	s.db.First(&group)
	if group.ResolvedAt != time.Unix(2050, 0).UnixNano() {
		t.Fatalf("mixed group recovery lost: %+v", group)
	}
	if err := s.Enqueue(context.Background(), a, f, table, notice("resolved", 1900, 1950)); err != nil {
		t.Fatal(err)
	}
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 2000, 0)); err != nil {
		t.Fatal(err)
	}
	countJobs(t, s, 1)
}

func TestRedactKnownSecrets(t *testing.T) {
	text := redact(`{"password":"long secret value","api_key":"key123"} Bearer credential sk-abcdefghijk Authorization: Bearer authvalue`)
	for _, secret := range []string{"long secret value", "key123", "credential", "sk-abcdefghijk", "authvalue"} {
		if strings.Contains(text, secret) {
			t.Fatalf("leaked %s: %s", secret, text)
		}
	}
}

func TestConcurrentWorkersClaimOnlyOnce(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	var wait sync.WaitGroup
	results := make(chan bool, 8)
	failures := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wait.Add(1)
		go func(id int) {
			defer wait.Done()
			_, ok, err := s.claim(context.Background(), fmt.Sprint(id))
			results <- ok
			failures <- err
		}(i)
	}
	wait.Wait()
	close(results)
	close(failures)
	claims := 0
	for ok := range results {
		if ok {
			claims++
		}
	}
	for err := range failures {
		if err != nil {
			t.Fatal(err)
		}
	}
	if claims != 1 {
		t.Fatalf("concurrent claims %d", claims)
	}
}

func TestCancellationStopsAnalysis(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	w := NewWorker(s, func(ctx context.Context, _ int, _ Seed) (Result, error) {
		cancel()
		<-ctx.Done()
		return Result{}, ctx.Err()
	}, func(context.Context, int, *db.PushMsg) error { t.Fatal("cancelled analysis delivered"); return nil }, "")
	if err := w.ProcessOne(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestCooldownUsesCurrentWindow(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		return Result{Summary: "done", Snapshot: "saved"}, nil
	}, func(context.Context, int, *db.PushMsg) error { return nil }, "")
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	s.now = func() time.Time { return time.Unix(3000, 0) }
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	countJobs(t, s, 2)
	var latest db.AlarmAIAnalysis
	s.db.Last(&latest)
	if latest.WindowStart != 2100 || latest.WindowEnd != 3060 {
		t.Fatalf("stale window %d..%d", latest.WindowStart, latest.WindowEnd)
	}
}

func TestRevokedAccessCancelsDeliveryRetry(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	sends := 0
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		return Result{Summary: "done", Snapshot: "saved"}, nil
	}, func(context.Context, int, *db.PushMsg) error { sends++; return errors.New("retry") }, "")
	allowed := true
	w.SetCheckAccess(func(context.Context, int, string) error {
		if !allowed {
			return errors.New("revoked")
		}
		return nil
	})
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	firstSends := sends
	allowed = false
	s.now = func() time.Time { return time.Unix(2300, 0) }
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	if sends != firstSends {
		t.Fatal("revoked owner received delivery")
	}
	var job db.AlarmAIAnalysis
	s.db.First(&job)
	if job.Status != "cancelled" || job.Snapshot != "saved" {
		t.Fatalf("cancelled result %+v", job)
	}
}

func TestRuleDisabledDuringAnalysisDoesNotDeliver(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		if err := s.db.Model(&a).Update("status", db.AlarmStatusClose).Error; err != nil {
			t.Fatal(err)
		}
		return Result{Summary: "done", Snapshot: "saved"}, nil
	}, func(context.Context, int, *db.PushMsg) error { t.Fatal("disabled rule delivered"); return nil }, "")
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestRevokedBetweenChannelsStopsRemainingSends(t *testing.T) {
	s, a, f, table := testStore(t)
	if err := s.Enqueue(context.Background(), a, f, table, notice("firing", 1900, 0)); err != nil {
		t.Fatal(err)
	}
	allowed := true
	sends := 0
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		return Result{Summary: "done", Snapshot: "saved"}, nil
	}, func(context.Context, int, *db.PushMsg) error { sends++; allowed = false; return nil }, "")
	w.SetCheckAccess(func(context.Context, int, string) error {
		if !allowed {
			return errors.New("revoked")
		}
		return nil
	})
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	if sends != 1 {
		t.Fatalf("sent %d channels after revocation", sends)
	}
}

func TestFinalAttemptCrashRecoveryDoesNotResend(t *testing.T) {
	s, a, _, _ := testStore(t)
	job := db.AlarmAIAnalysis{Token: "crash-final-attempt", AlarmID: a.ID, Uid: a.Uid, Status: "delivery", Summary: "saved", Snapshot: "immutable", LeaseUntil: 1800, LeaseOwner: "crashed"}
	if err := s.db.Create(&job).Error; err != nil {
		t.Fatal(err)
	}
	delivery := db.AlarmAIDelivery{AnalysisID: job.ID, ChannelID: 2, Status: "pending", Attempts: maxAttempts, LeaseUntil: 2300, LeaseOwner: "crashed"}
	if err := s.db.Create(&delivery).Error; err != nil {
		t.Fatal(err)
	}
	w := NewWorker(s, func(context.Context, int, Seed) (Result, error) {
		t.Fatal("repeated completed analysis")
		return Result{}, nil
	}, func(context.Context, int, *db.PushMsg) error { t.Fatal("resent exhausted channel"); return nil }, "")
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	s.db.First(&job, job.ID)
	if job.Status != "delivery" {
		t.Fatalf("live final lease ignored: %s", job.Status)
	}
	s.now = func() time.Time { return time.Unix(2400, 0) }
	if err := w.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	s.db.First(&delivery, delivery.ID)
	s.db.First(&job, job.ID)
	if delivery.Status != "failed" || delivery.Attempts != maxAttempts || delivery.LeaseUntil != 0 {
		t.Fatalf("exhausted delivery not reconciled: %+v", delivery)
	}
	if job.Status != "done" || job.Snapshot != "immutable" {
		t.Fatalf("completed analysis changed: %+v", job)
	}
}
