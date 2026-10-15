package alarmai

import (
	"context"
	"sync"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/alarm/pusher"
	"github.com/clickvisual/clickvisual/api/internal/service/troubleshoot"
)

var lifecycle struct {
	sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

// Init is safe to call both at startup and after a late metadata DB attachment.
func Init() error {
	lifecycle.Lock()
	defer lifecycle.Unlock()
	if lifecycle.cancel != nil || invoker.Db == nil || config.IsPrivateLiteMode() || !econf.GetBool("alarm.ai.enabled") {
		return nil
	}
	s := NewStore(invoker.Db, econf.GetInt("alarm.ai.cooldownSeconds"))
	w := NewWorker(s, func(ctx context.Context, uid int, seed Seed) (Result, error) {
		result, err := troubleshoot.AnalyzeAlert(ctx, uid, troubleshoot.AlertSeed{Title: seed.Title, Description: seed.Description, Tid: seed.Tid, Query: seed.Query, Start: seed.Start, End: seed.End})
		return Result{Summary: result.Summary, Snapshot: result.Snapshot}, err
	}, func(ctx context.Context, id int, msg *db.PushMsg) error {
		channel, err := db.AlarmChannelInfo(s.db.WithContext(ctx), id)
		if err != nil {
			return err
		}
		return pusher.SendContext(ctx, &channel, msg)
	}, econf.GetString("app.rootURL"))
	w.SetCheckAccess(troubleshoot.CheckAlertAnalysisAccess)
	service.SetAlertObserver(func(ctx context.Context, alarm db.Alarm, filterID int, n db.Notification) error {
		var filter db.AlarmFilter
		q := s.db.WithContext(ctx).Where("alarm_id = ?", alarm.ID)
		if filterID != 0 {
			q = q.Where("id = ?", filterID)
		}
		if err := q.First(&filter).Error; err != nil {
			return err
		}
		table, err := db.TableInfo(s.db.WithContext(ctx), filter.Tid)
		if err != nil {
			return err
		}
		return s.Enqueue(ctx, alarm, filter, table, n)
	})
	ctx, cancel := context.WithCancel(context.Background())
	lifecycle.cancel = cancel
	lifecycle.done = make(chan struct{})
	done := lifecycle.done
	go func() {
		defer close(done)
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := w.ProcessOne(ctx); err != nil && ctx.Err() == nil {
					elog.Warn("alert AI worker failed", elog.FieldErr(err))
				}
			}
		}
	}()
	return nil
}

func Close() error {
	lifecycle.Lock()
	defer lifecycle.Unlock()
	service.SetAlertObserver(nil)
	if lifecycle.cancel == nil {
		return nil
	}
	lifecycle.cancel()
	<-lifecycle.done
	lifecycle.cancel = nil
	lifecycle.done = nil
	return nil
}
