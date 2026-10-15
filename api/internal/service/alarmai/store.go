package alarmai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

const maxAttempts = 3
const leaseDuration = 180 * time.Second

var errConcurrent = errors.New("concurrent alert state update")

type Store struct {
	db       *gorm.DB
	cooldown int
	now      func() time.Time
}

func NewStore(d *gorm.DB, cooldown int) *Store {
	if cooldown <= 0 {
		cooldown = 900
	}
	return &Store{db: d, cooldown: cooldown, now: time.Now}
}

// JSON sorts map keys, making label order irrelevant to identity.
func fingerprint(alarmID, filterID, tableID, instanceID int, labels map[string]string) string {
	encoded, _ := json.Marshal(labels)
	h := sha256.Sum256([]byte(fmt.Sprintf("%d/%d/%d/%d/%s", alarmID, filterID, tableID, instanceID, encoded)))
	return hex.EncodeToString(h[:])
}

func (s *Store) Enqueue(ctx context.Context, alarm db.Alarm, filter db.AlarmFilter, table db.BaseTable, n db.Notification) error {
	if n.GetStatus() != db.AlarmStatusFiring && n.GetStatus() != db.AlarmStatusNormal {
		return nil
	}
	for _, event := range n.Alerts {
		if event.StartsAt.IsZero() {
			continue
		}
		for attempt := 0; attempt < 3; attempt++ {
			err := s.enqueueEvent(ctx, alarm, filter, table, n, event)
			if err == nil {
				break
			}
			if attempt == 2 {
				return err
			}
		}
	}
	return nil
}

func (s *Store) enqueueEvent(ctx context.Context, alarm db.Alarm, filter db.AlarmFilter, table db.BaseTable, n db.Notification, event db.Alert) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		labels := event.Labels
		if len(labels) == 0 {
			labels = n.CommonLabels
		}
		group := db.AlarmAIGroup{Fingerprint: fingerprint(alarm.ID, filter.ID, table.ID, table.Database.Iid, labels)}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&group).Error; err != nil {
			return err
		}
		if err := tx.Where("fingerprint = ?", group.Fingerprint).First(&group).Error; err != nil {
			return err
		}
		start := event.StartsAt.UnixNano()
		resolved := n.GetStatus() == db.AlarmStatusNormal
		if event.Status != "" {
			resolved = event.Status == "resolved"
		}
		if start < group.StartsAt {
			return nil
		}
		if resolved {
			if event.EndsAt.IsZero() || event.EndsAt.Before(event.StartsAt) {
				return nil
			}
			if start == group.StartsAt && event.EndsAt.UnixNano() <= group.ResolvedAt {
				return nil
			}
			// A newer recovery also establishes a replay watermark when firing was missed.
			updated := tx.Model(&db.AlarmAIGroup{}).Where("id = ? AND version = ?", group.ID, group.Version).Updates(map[string]any{"starts_at": start, "resolved_at": event.EndsAt.UnixNano(), "version": group.Version + 1})
			if updated.Error != nil {
				return updated.Error
			}
			if updated.RowsAffected != 1 {
				return errConcurrent
			}
			return tx.Model(&db.AlarmAIAnalysis{}).Where("group_id = ? AND starts_at <= ? AND snapshot = ? AND status IN ?", group.ID, start, "", []string{"queued", "working"}).Updates(map[string]any{"status": "cancelled", "lease_owner": "", "lease_until": 0}).Error
		}
		if group.ResolvedAt > 0 && start <= group.ResolvedAt {
			return nil
		}
		same := start == group.StartsAt
		if same && group.JobID != 0 {
			var previous db.AlarmAIAnalysis
			if err := tx.First(&previous, group.JobID).Error; err != nil {
				return err
			}
			if previous.Status == "queued" || previous.Status == "working" || previous.Snapshot != "" && s.now().Unix() < group.LastSuccessAt+int64(previous.CooldownSeconds) {
				return tx.Model(&db.AlarmAIAnalysis{}).Where("id = ?", previous.ID).UpdateColumn("event_count", gorm.Expr("event_count + 1")).Error
			}
			// A failed incident remains capped until a new firing incident starts.
			if previous.Status == "failed" {
				return nil
			}
		}
		cooldown := alarm.AICooldownSeconds
		if cooldown <= 0 {
			cooldown = s.cooldown
		}
		trigger := event.StartsAt
		if same {
			trigger = s.now()
		}
		job := db.AlarmAIAnalysis{GroupID: group.ID, Token: uuid.NewString(), AlarmID: alarm.ID, FilterID: filter.ID, Uid: alarm.Uid, Tid: filter.Tid, StartsAt: start, WindowStart: trigger.Add(-15 * time.Minute).Unix(), WindowEnd: trigger.Add(time.Minute).Unix(), Title: alarm.Name, Description: alarm.Desc, Query: filter.When, ChannelIDs: alarm.ChannelIds, CooldownSeconds: cooldown, EventCount: 1, Status: "queued"}
		if err := tx.Create(&job).Error; err != nil {
			return err
		}
		updated := tx.Model(&db.AlarmAIGroup{}).Where("id = ? AND version = ?", group.ID, group.Version).Updates(map[string]any{"version": group.Version + 1, "starts_at": start, "resolved_at": 0, "job_id": job.ID, "last_success_at": 0})
		if updated.Error != nil {
			return updated.Error
		}
		if updated.RowsAffected != 1 {
			return errConcurrent
		}
		if !same {
			return tx.Model(&db.AlarmAIAnalysis{}).Where("group_id = ? AND id <> ? AND snapshot = ? AND status IN ?", group.ID, job.ID, "", []string{"queued", "working"}).Update("status", "cancelled").Error
		}
		return nil
	})
}

func (s *Store) claim(ctx context.Context, owner string) (db.AlarmAIAnalysis, bool, error) {
	var candidates []db.AlarmAIAnalysis
	now := s.now().Unix()
	err := s.db.WithContext(ctx).Where("status IN ? AND next_attempt_at <= ? AND lease_until <= ?", []string{"queued", "working", "delivery"}, now, now).Order("id").Limit(8).Find(&candidates).Error
	if err != nil {
		return db.AlarmAIAnalysis{}, false, err
	}
	for _, job := range candidates {
		updates := map[string]any{"lease_owner": owner, "lease_until": now + int64(leaseDuration/time.Second)}
		if job.Snapshot == "" {
			if job.Attempts >= maxAttempts {
				res := s.db.WithContext(ctx).Model(&db.AlarmAIAnalysis{}).Where("id = ? AND lease_until <= ? AND snapshot = ? AND status IN ?", job.ID, now, "", []string{"queued", "working"}).Update("status", "failed")
				if res.Error != nil {
					return job, false, res.Error
				}
				continue
			}
			updates["attempts"] = gorm.Expr("attempts + 1")
			updates["status"] = "working"
		}
		res := s.db.WithContext(ctx).Model(&db.AlarmAIAnalysis{}).Where("id = ? AND lease_until <= ? AND status IN ? AND snapshot = ? AND attempts = ?", job.ID, now, []string{"queued", "working", "delivery"}, job.Snapshot, job.Attempts).Updates(updates)
		if res.Error != nil {
			return job, false, res.Error
		}
		if res.RowsAffected == 1 {
			job.LeaseOwner = owner
			job.LeaseUntil = now + int64(leaseDuration/time.Second)
			if job.Snapshot == "" {
				job.Attempts++
			}
			return job, true, nil
		}
	}
	return db.AlarmAIAnalysis{}, false, nil
}
