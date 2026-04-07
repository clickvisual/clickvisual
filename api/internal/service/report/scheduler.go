package report

import (
	"fmt"
	"sync"
	"time"

	"github.com/gotomicro/ego/core/elog"
	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	service *Service
	cron    *cron.Cron

	mu      sync.Mutex
	entryID map[int]cron.EntryID
}

func NewScheduler(service *Service) *Scheduler {
	return &Scheduler{
		service: service,
		cron:    cron.New(cron.WithSeconds()),
		entryID: make(map[int]cron.EntryID),
	}
}

func (s *Scheduler) Start() error {
	var (
		reports []int
		err     error
	)
	// Start first so newly added entries can calculate Next immediately.
	s.cron.Start()
	if s.service.useDB() {
		reports, err = s.service.enabledReportIDsFromDB()
		if err != nil {
			ctx := s.cron.Stop()
			<-ctx.Done()
			return err
		}
	} else {
		s.service.mu.RLock()
		reports = append([]int(nil), s.service.enabledReportIDsLocked()...)
		s.service.mu.RUnlock()
	}

	for _, reportID := range reports {
		if err = s.Reload(reportID); err != nil {
			ctx := s.cron.Stop()
			<-ctx.Done()
			return err
		}
	}
	return nil
}

func (s *Scheduler) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
}

func (s *Scheduler) Reload(reportID int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, ok := s.entryID[reportID]; ok {
		s.cron.Remove(entryID)
		delete(s.entryID, reportID)
	}

	spec := ""
	if s.service.useDB() {
		report, err := s.service.getReportByIDFromDB(reportID)
		if err != nil {
			// Report was removed or unavailable; treat as unload.
			return nil
		}
		schedule, found, err := s.service.getScheduleByReportIDFromDB(reportID)
		if err != nil {
			return err
		}
		if !found || report.Status != "enabled" || schedule.Status != "enabled" {
			_ = s.service.syncScheduleNextRun(reportID, time.Time{})
			return nil
		}
		spec = schedule.Cron
	} else {
		s.service.mu.RLock()
		item, ok := s.service.reportItem(reportID)
		if !ok {
			s.service.mu.RUnlock()
			return fmt.Errorf("report not found: %d", reportID)
		}
		schedule, ok := s.service.schedules[reportID]
		if !ok {
			s.service.mu.RUnlock()
			return fmt.Errorf("report schedule not found: %d", reportID)
		}
		if item.Status != "enabled" {
			s.service.mu.RUnlock()
			return nil
		}
		spec = schedule.Cron
		s.service.mu.RUnlock()
	}

	entryID, err := s.cron.AddFunc(spec, func() {
		if _, runErr := s.service.RunScheduled(reportID); runErr != nil {
			elog.Error("reportScheduler", elog.String("step", "run"), elog.Any("reportId", reportID), elog.FieldErr(runErr))
		}
	})
	if err != nil {
		return err
	}
	s.entryID[reportID] = entryID
	if s.service.useDB() {
		next := s.cron.Entry(entryID).Next
		if err = s.service.syncScheduleNextRun(reportID, next); err != nil {
			return err
		}
	}
	return nil
}

func (s *Scheduler) Remove(reportID int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, ok := s.entryID[reportID]; ok {
		s.cron.Remove(entryID)
		delete(s.entryID, reportID)
	}
}

func (s *Scheduler) Snapshot(reportID int) (bool, time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entryID, ok := s.entryID[reportID]
	if !ok {
		return false, time.Time{}
	}
	entry := s.cron.Entry(entryID)
	return true, entry.Next
}

func (s *Service) enabledReportIDsLocked() []int {
	reports := make([]int, 0, len(s.list))
	for _, item := range s.list {
		if item.Status == "enabled" {
			reports = append(reports, item.ID)
		}
	}
	return reports
}
