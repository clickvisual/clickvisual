package alarmai

import (
	"context"
	"errors"
	"regexp"
	"slices"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

type Seed struct {
	Title, Description string
	Tid                int
	Query              string
	Start, End         int64
}
type Result struct{ Summary, Snapshot string }
type Analyze func(context.Context, int, Seed) (Result, error)
type Send func(context.Context, int, *db.PushMsg) error

type Worker struct {
	store       *Store
	analyze     Analyze
	send        Send
	rootURL     string
	checkAccess func(context.Context, int, string) error
}

func NewWorker(s *Store, analyze Analyze, send Send, rootURL string) *Worker {
	return &Worker{store: s, analyze: analyze, send: send, rootURL: rootURL}
}

func (w *Worker) SetCheckAccess(check func(context.Context, int, string) error) {
	w.checkAccess = check
}

func (w *Worker) ProcessOne(ctx context.Context) error {
	s := w.store
	job, ok, err := s.claim(ctx, uuid.NewString())
	if err != nil || !ok {
		return err
	}
	workCtx, cancel := context.WithTimeout(ctx, 100*time.Second)
	defer cancel()
	var alarm db.Alarm
	if err := s.db.WithContext(workCtx).First(&alarm, job.AlarmID).Error; err != nil || alarm.Status == db.AlarmStatusClose {
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return w.finish(job, "cancelled")
	}
	if job.Snapshot == "" {
		// Recheck switches after queuing, before spending a model call.
		eligible, err := enabledChannelIDs(s.db.WithContext(workCtx), alarm.ChannelIds)
		if err != nil {
			return err
		}
		if !slices.ContainsFunc(job.ChannelIDs, func(id int) bool { return slices.Contains(eligible, id) }) {
			return w.finish(job, "cancelled")
		}
		result, err := w.analyze(workCtx, job.Uid, Seed{Title: job.Title, Description: job.Description, Tid: job.Tid, Query: job.Query, Start: job.WindowStart, End: job.WindowEnd})
		if err != nil || result.Snapshot == "" {
			status := "queued"
			if job.Attempts >= maxAttempts {
				status = "failed"
			}
			return w.finish(job, status)
		}
		err = s.db.WithContext(workCtx).Transaction(func(tx *gorm.DB) error {
			updated := tx.Model(&db.AlarmAIAnalysis{}).Where("id = ? AND lease_owner = ? AND lease_until > ? AND status = ? AND snapshot = ?", job.ID, job.LeaseOwner, s.now().Unix(), "working", "").Updates(map[string]any{"summary": redact(result.Summary), "snapshot": result.Snapshot, "status": "delivery"})
			if updated.Error != nil {
				return updated.Error
			}
			if updated.RowsAffected != 1 {
				return errConcurrent
			}
			if err := tx.Model(&db.AlarmAIGroup{}).Where("id = ? AND job_id = ? AND starts_at = ?", job.GroupID, job.ID, job.StartsAt).Updates(map[string]any{"last_success_at": s.now().Unix(), "version": gorm.Expr("version + 1")}).Error; err != nil {
				return err
			}
			for _, id := range job.ChannelIDs {
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&db.AlarmAIDelivery{AnalysisID: job.ID, ChannelID: id, Status: "pending"}).Error; err != nil {
					return err
				}
			}
			return nil
		})
		if errors.Is(err, errConcurrent) {
			return nil
		}
		if err != nil {
			return err
		}
		job.Snapshot = result.Snapshot
		job.Summary = redact(result.Summary)
	}
	var deliveries []db.AlarmAIDelivery
	// A crashed final send has an unknown remote outcome and must not be sent again.
	if err := s.db.WithContext(workCtx).Model(&db.AlarmAIDelivery{}).Where("analysis_id = ? AND status = ? AND attempts >= ? AND lease_until <= ?", job.ID, "pending", maxAttempts, s.now().Unix()).Updates(map[string]any{"status": "failed", "lease_owner": "", "lease_until": 0}).Error; err != nil {
		return err
	}
	if err := s.db.WithContext(workCtx).Where("analysis_id = ? AND status = ? AND attempts < ?", job.ID, "pending", maxAttempts).Find(&deliveries).Error; err != nil {
		return err
	}
	for _, delivery := range deliveries {
		if workCtx.Err() != nil {
			break
		}
		// Recheck each channel: a rule or permission can change during a prior send.
		if err := s.db.WithContext(workCtx).First(&alarm, job.AlarmID).Error; err != nil || alarm.Status == db.AlarmStatusClose {
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			return w.finish(job, "cancelled")
		}
		eligible, err := enabledChannelIDs(s.db.WithContext(workCtx), db.Ints{delivery.ChannelID})
		if err != nil {
			return err
		}
		if len(eligible) == 0 || !slices.Contains(alarm.ChannelIds, delivery.ChannelID) {
			if err := s.db.WithContext(workCtx).Model(&db.AlarmAIDelivery{}).Where("id = ? AND status = ?", delivery.ID, "pending").Update("status", "cancelled").Error; err != nil {
				return err
			}
			continue
		}
		if w.checkAccess != nil {
			if err := w.checkAccess(workCtx, job.Uid, job.Snapshot); err != nil {
				return w.finish(job, "cancelled")
			}
		}
		claimed := s.db.WithContext(workCtx).Model(&db.AlarmAIDelivery{}).Where("id = ? AND status = ? AND lease_until <= ? AND attempts < ?", delivery.ID, "pending", s.now().Unix(), maxAttempts).Updates(map[string]any{"lease_owner": job.LeaseOwner, "lease_until": job.LeaseUntil, "attempts": gorm.Expr("attempts + 1")})
		if claimed.Error != nil {
			return claimed.Error
		}
		if claimed.RowsAffected != 1 {
			continue
		}
		msg := message(job, w.rootURL)
		err = w.send(workCtx, delivery.ChannelID, msg)
		status := "pending"
		if err == nil {
			status = "sent"
		} else if delivery.Attempts+1 >= maxAttempts {
			status = "failed"
		}
		// A webhook error can be ambiguous. Only a confirmed success is marked sent.
		if err := s.db.Model(&db.AlarmAIDelivery{}).Where("id = ? AND lease_owner = ?", delivery.ID, job.LeaseOwner).Updates(map[string]any{"status": status, "lease_owner": "", "lease_until": 0}).Error; err != nil {
			return err
		}
	}
	var pending int64
	if err := s.db.Model(&db.AlarmAIDelivery{}).Where("analysis_id = ? AND status = ?", job.ID, "pending").Count(&pending).Error; err != nil {
		return err
	}
	status := "done"
	if pending > 0 {
		status = "delivery"
	}
	return w.finish(job, status)
}

func (w *Worker) finish(job db.AlarmAIAnalysis, status string) error {
	return w.store.db.Model(&db.AlarmAIAnalysis{}).Where("id = ? AND lease_owner = ?", job.ID, job.LeaseOwner).Updates(map[string]any{"status": status, "lease_owner": "", "lease_until": 0, "next_attempt_at": w.store.now().Add(time.Minute).Unix()}).Error
}

var secrets = regexp.MustCompile(`(?i)bearer\s+[^\s"'<>]+|(?:password|passwd|secret|token|api[_-]?key|authorization)["']?\s*[=:]\s*(?:"[^"]*"|'[^']*'|(?:bearer\s+)?[^\s,;<>]+)|sk-[A-Za-z0-9_-]{8,}`)

func redact(text string) string {
	return secrets.ReplaceAllString(text, "[REDACTED]")
}
