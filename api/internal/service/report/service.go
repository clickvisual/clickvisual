package report

import (
	"fmt"
	"strings"
	"sync"
	"time"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type seedData struct {
	list       []view.RespReportListItem
	editors    map[int]view.RespReportEditorDraft
	schedules  map[int]view.RespReportSchedule
	previews   map[int]view.RespReportExecutionPreview
	executions map[int][]view.RespReportExecutionRecord
	deliveries map[int]view.RespReportSendSummary
	channels   []view.RespReportChannel
	sender     previewSender
	now        func() time.Time
	nextExecID int
}

type Service struct {
	mu sync.RWMutex

	list       []view.RespReportListItem
	editors    map[int]view.RespReportEditorDraft
	schedules  map[int]view.RespReportSchedule
	previews   map[int]view.RespReportExecutionPreview
	executions map[int][]view.RespReportExecutionRecord
	deliveries map[int]view.RespReportSendSummary
	channels   []view.RespReportChannel
	sender     previewSender
	now        func() time.Time
	sleep      func(time.Duration)
	nextExecID int
	scheduler  *Scheduler
}

var defaultService = newService()

func newService() *Service {
	seed := defaultSeed()
	return &Service{
		list:       cloneList(seed.list),
		editors:    cloneEditorMap(seed.editors),
		schedules:  cloneScheduleMap(seed.schedules),
		previews:   clonePreviewMap(seed.previews),
		executions: cloneExecutionMap(seed.executions),
		deliveries: cloneDeliveryMap(seed.deliveries),
		channels:   cloneChannelList(seed.channels),
		sender:     newHTTPPreviewSender(),
		now:        time.Now,
		sleep:      time.Sleep,
		nextExecID: nextExecutionID(seed.executions),
	}
}

func ResetForTest() {
	if defaultService != nil && defaultService.scheduler != nil {
		defaultService.scheduler.Stop()
	}
	defaultService = newService()
}

func UpsertSchedule(req view.ReqReportSchedule) (view.RespReportSchedule, error) {
	return defaultService.UpsertSchedule(req)
}

func GetSchedule(nodeID int) (view.RespReportSchedule, error) {
	return defaultService.GetSchedule(nodeID)
}

func UpsertReport(req view.ReqReportDefinition) (view.RespReportDefinition, error) {
	return defaultService.UpsertReport(req)
}

func GetReport(reportID int) (view.RespReportDefinition, error) {
	return defaultService.GetReport(reportID)
}

func DeleteReport(reportID int) (view.RespReportDeleteResult, error) {
	return defaultService.DeleteReport(reportID)
}

func GetWorkspace(reportID int) (view.RespReportWorkspace, error) {
	return defaultService.GetWorkspace(reportID)
}

func ListReports() ([]view.RespReportListItem, error) {
	return defaultService.ListReports()
}

func GetEditor(reportID int) (view.RespReportEditorDraft, error) {
	return defaultService.GetEditor(reportID)
}

func GetDelivery(reportID int) (view.RespReportSendSummary, error) {
	return defaultService.GetDelivery(reportID)
}

func ListChannels() ([]view.RespReportChannel, error) {
	return defaultService.ListChannels()
}

func GetPreview(reportID int) (view.RespReportExecutionPreview, error) {
	return defaultService.GetPreview(reportID)
}

func ListExecutions(reportID int) ([]view.RespReportExecutionRecord, error) {
	return defaultService.ListExecutions(reportID)
}

func RunPreview(reportID int) (view.RespReportPreviewRunResult, error) {
	return defaultService.RunPreview(reportID)
}

func RunScheduled(reportID int) (view.RespReportPreviewRunResult, error) {
	return defaultService.RunScheduled(reportID)
}

func StartScheduler() error {
	return defaultService.StartScheduler()
}

func StopScheduler() {
	defaultService.StopScheduler()
}

func (s *Service) UpsertReport(req view.ReqReportDefinition) (view.RespReportDefinition, error) {
	normalizedReq, err := normalizeReportDefinition(req, s.now())
	if err != nil {
		return view.RespReportDefinition{}, err
	}
	req = normalizedReq

	if s.useDB() {
		return s.upsertReportFromDB(req)
	}
	if strings.TrimSpace(req.Name) == "" {
		return view.RespReportDefinition{}, fmt.Errorf("name 不能为空")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.now().Format(time.RFC3339)
	status := req.Status
	if status == "" {
		status = "enabled"
	}
	queryMode := req.QueryMode
	if queryMode == "" {
		queryMode = "sql"
	}
	outputFormat := req.OutputFormat
	if outputFormat == "" {
		outputFormat = "markdown"
	}
	templateKey := req.TemplateKey
	if templateKey == "" {
		templateKey = "default-template"
	}

	if req.ReportID > 0 {
		item, found := s.reportItem(req.ReportID)
		if !found {
			return view.RespReportDefinition{}, fmt.Errorf("report not found: %d", req.ReportID)
		}
		editor := s.editors[req.ReportID]
		item.Name = req.Name
		item.Desc = req.Desc
		item.Status = status
		item.DutyUID = req.DutyUID
		item.UpdatedAt = now
		for idx := range s.list {
			if s.list[idx].ID == req.ReportID {
				s.list[idx] = item
				break
			}
		}
		editor.ReportID = req.ReportID
		editor.NodeID = item.NodeID
		editor.Name = req.Name
		editor.Desc = req.Desc
		editor.QueryMode = queryMode
		editor.QueryText = req.QueryText
		editor.TemplateKey = templateKey
		editor.OutputFormat = outputFormat
		s.editors[req.ReportID] = editor

		return view.RespReportDefinition{
			ReportID:     req.ReportID,
			Name:         req.Name,
			Desc:         req.Desc,
			Status:       status,
			QueryMode:    queryMode,
			QueryText:    req.QueryText,
			TemplateKey:  templateKey,
			OutputFormat: outputFormat,
			DutyUID:      req.DutyUID,
			CreatorUID:   req.CreatorUID,
			UpdatedAt:    now,
		}, nil
	}

	newID := 1001
	for _, item := range s.list {
		if item.ID >= newID {
			newID = item.ID + 1
		}
	}
	s.list = append(s.list, view.RespReportListItem{
		ID:        newID,
		NodeID:    newID,
		Name:      req.Name,
		Desc:      req.Desc,
		Status:    status,
		DutyUID:   req.DutyUID,
		UpdatedAt: now,
	})
	s.editors[newID] = view.RespReportEditorDraft{
		ReportID:            newID,
		NodeID:              newID,
		Name:                req.Name,
		Desc:                req.Desc,
		QueryMode:           queryMode,
		QueryText:           req.QueryText,
		TemplateKey:         templateKey,
		OutputFormat:        outputFormat,
		RecipientChannelIDs: []int{},
	}

	return view.RespReportDefinition{
		ReportID:     newID,
		Name:         req.Name,
		Desc:         req.Desc,
		Status:       status,
		QueryMode:    queryMode,
		QueryText:    req.QueryText,
		TemplateKey:  templateKey,
		OutputFormat: outputFormat,
		DutyUID:      req.DutyUID,
		CreatorUID:   req.CreatorUID,
		UpdatedAt:    now,
	}, nil
}

func (s *Service) GetReport(reportID int) (view.RespReportDefinition, error) {
	if s.useDB() {
		return s.getReportFromDB(reportID)
	}
	if reportID == 0 {
		return view.RespReportDefinition{}, fmt.Errorf("reportId 不能为空")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	item, found := s.reportItem(reportID)
	if !found {
		return view.RespReportDefinition{}, fmt.Errorf("report not found: %d", reportID)
	}
	editor := s.editors[reportID]

	return view.RespReportDefinition{
		ReportID:     item.ID,
		Name:         item.Name,
		Desc:         item.Desc,
		Status:       item.Status,
		QueryMode:    editor.QueryMode,
		QueryText:    editor.QueryText,
		TemplateKey:  editor.TemplateKey,
		OutputFormat: editor.OutputFormat,
		DutyUID:      item.DutyUID,
		CreatorUID:   0,
		UpdatedAt:    item.UpdatedAt,
	}, nil
}

func (s *Service) DeleteReport(reportID int) (view.RespReportDeleteResult, error) {
	if s.useDB() {
		return s.deleteReportFromDB(reportID)
	}
	if reportID == 0 {
		return view.RespReportDeleteResult{}, fmt.Errorf("reportId 不能为空")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, found := s.reportItem(reportID); !found {
		return view.RespReportDeleteResult{}, fmt.Errorf("report not found: %d", reportID)
	}

	nextList := make([]view.RespReportListItem, 0, len(s.list)-1)
	for _, item := range s.list {
		if item.ID != reportID {
			nextList = append(nextList, item)
		}
	}
	s.list = nextList
	delete(s.editors, reportID)
	delete(s.schedules, reportID)
	delete(s.previews, reportID)
	delete(s.executions, reportID)
	delete(s.deliveries, reportID)
	if s.scheduler != nil {
		s.scheduler.Remove(reportID)
	}

	return view.RespReportDeleteResult{ReportID: reportID}, nil
}

func (s *Service) UpsertSchedule(req view.ReqReportSchedule) (view.RespReportSchedule, error) {
	if s.useDB() {
		return s.upsertScheduleFromDB(req)
	}
	if req.NodeID == 0 {
		return view.RespReportSchedule{}, fmt.Errorf("nodeId 不能为空")
	}
	if len(req.ChannelIDs) == 0 {
		return view.RespReportSchedule{}, fmt.Errorf("channelIds 不能为空")
	}
	item, found := s.reportItem(req.NodeID)
	if !found {
		return view.RespReportSchedule{}, fmt.Errorf("report not found: %d", req.NodeID)
	}

	resp := view.RespReportSchedule{
		NodeID:        req.NodeID,
		Desc:          item.Desc,
		DutyUID:       item.DutyUID,
		Cron:          req.Cron,
		Typ:           req.Typ,
		ChannelIDs:    append([]int(nil), req.ChannelIDs...),
		IsRetry:       req.IsRetry,
		RetryTimes:    req.RetryTimes,
		RetryInterval: req.RetryInterval,
	}

	s.mu.Lock()
	s.schedules[req.NodeID] = resp
	if editor, ok := s.editors[req.NodeID]; ok {
		editor.RecipientChannelIDs = append([]int(nil), req.ChannelIDs...)
		s.editors[req.NodeID] = editor
	}
	shouldReload := s.scheduler != nil
	s.mu.Unlock()

	if shouldReload {
		if err := s.scheduler.Reload(req.NodeID); err != nil {
			return view.RespReportSchedule{}, err
		}
	}
	return resp, nil
}

func (s *Service) GetSchedule(nodeID int) (view.RespReportSchedule, error) {
	if s.useDB() {
		return s.getScheduleFromDB(nodeID)
	}
	if nodeID == 0 {
		return view.RespReportSchedule{}, fmt.Errorf("nodeId 不能为空")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	resp, ok := s.schedules[nodeID]
	if !ok {
		return view.RespReportSchedule{}, fmt.Errorf("report schedule not found: %d", nodeID)
	}

	return resp, nil
}

func (s *Service) GetWorkspace(reportID int) (view.RespReportWorkspace, error) {
	if s.useDB() {
		return s.getWorkspaceFromDB(reportID)
	}
	s.mu.RLock()
	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		s.mu.RUnlock()
		return view.RespReportWorkspace{}, err
	}

	reportItem, ok := s.reportItem(activeID)
	if !ok {
		s.mu.RUnlock()
		return view.RespReportWorkspace{}, fmt.Errorf("report not found: %d", activeID)
	}
	list := cloneList(s.list)
	editor := s.editors[activeID]
	schedule := s.schedules[activeID]
	preview := s.previews[activeID]
	delivery := s.deliveries[activeID]
	executions := append([]view.RespReportExecutionRecord(nil), s.executions[activeID]...)
	channels := cloneChannelList(s.channels)
	s.mu.RUnlock()

	runtime := s.buildScheduleRuntime(reportItem, executions)

	return view.RespReportWorkspace{
		ActiveReportID: activeID,
		List:           list,
		Editor:         editor,
		Schedule:       schedule,
		Preview:        preview,
		Executions:     executions,
		Delivery:       delivery,
		Channels:       channels,
		Runtime:        runtime,
	}, nil
}

func (s *Service) ListReports() ([]view.RespReportListItem, error) {
	if s.useDB() {
		return s.listReportsFromDB()
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	return cloneList(s.list), nil
}

func (s *Service) GetEditor(reportID int) (view.RespReportEditorDraft, error) {
	if s.useDB() {
		return s.getEditorFromDB(reportID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		return view.RespReportEditorDraft{}, err
	}

	return s.editors[activeID], nil
}

func (s *Service) GetDelivery(reportID int) (view.RespReportSendSummary, error) {
	if s.useDB() {
		return s.getDeliveryFromDB(reportID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		return view.RespReportSendSummary{}, err
	}

	return s.deliveries[activeID], nil
}

func (s *Service) ListChannels() ([]view.RespReportChannel, error) {
	if s.useDB() {
		return s.listChannelsFromDB()
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	return cloneChannelList(s.channels), nil
}

func (s *Service) GetPreview(reportID int) (view.RespReportExecutionPreview, error) {
	if s.useDB() {
		return s.getPreviewFromDB(reportID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		return view.RespReportExecutionPreview{}, err
	}

	return s.previews[activeID], nil
}

func (s *Service) ListExecutions(reportID int) ([]view.RespReportExecutionRecord, error) {
	if s.useDB() {
		return s.listExecutionsFromDB(reportID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		return nil, err
	}

	return append([]view.RespReportExecutionRecord(nil), s.executions[activeID]...), nil
}

func (s *Service) RunPreview(reportID int) (view.RespReportPreviewRunResult, error) {
	return s.executeReport(reportID, "manual")
}

func (s *Service) RunScheduled(reportID int) (view.RespReportPreviewRunResult, error) {
	return s.executeReport(reportID, "schedule")
}

func (s *Service) executeReport(reportID int, trigger string) (view.RespReportPreviewRunResult, error) {
	if s.useDB() {
		return s.executeReportFromDB(reportID, trigger)
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	activeID, err := s.resolveReportID(reportID)
	if err != nil {
		return view.RespReportPreviewRunResult{}, err
	}
	reportItem, ok := s.reportItem(activeID)
	if !ok {
		return view.RespReportPreviewRunResult{}, fmt.Errorf("report not found: %d", activeID)
	}
	preview := s.previews[activeID]
	if !preview.CanRun {
		return view.RespReportPreviewRunResult{}, fmt.Errorf("当前报表任务不可执行预览")
	}
	schedule := s.schedules[activeID]
	if len(schedule.ChannelIDs) == 0 {
		return view.RespReportPreviewRunResult{}, fmt.Errorf("当前报表未配置推送渠道")
	}
	editor := s.editors[activeID]
	startedAt := s.now()
	title, text := buildPreviewPushContent(reportItem, editor, schedule, startedAt)

	successCount := 0
	failedCount := 0
	channelResults := make(map[int]view.RespReportChannelSendSummary, len(schedule.ChannelIDs))
	for _, channelID := range schedule.ChannelIDs {
		channelResult := view.RespReportChannelSendSummary{
			ChannelID:  channelID,
			ChannelTyp: "dingtalk",
		}
		channel, found := s.findChannel(channelID)
		if found {
			channelResult.ChannelTyp = channel.Typ
			channelResult.LastSentAt = startedAt.Format(time.RFC3339)
			err = s.sender.Send(channel, title, text)
		} else {
			err = fmt.Errorf("channel not found: %d", channelID)
		}
		if err != nil {
			failedCount++
			channelResult.Failed = 1
		} else {
			successCount++
			channelResult.Success = 1
		}
		channelResults[channelID] = channelResult
	}

	finishedAt := s.now()
	preview.LastRunAt = finishedAt.Format(time.RFC3339)
	preview.Message = buildExecutionMessage(trigger, successCount, failedCount)
	s.previews[activeID] = preview

	execution := view.RespReportExecutionRecord{
		ID:              s.nextExecID,
		ReportID:        activeID,
		Status:          executionStatus(successCount, failedCount),
		Trigger:         trigger,
		StartedAt:       startedAt.Format(time.RFC3339),
		EndedAt:         finishedAt.Format(time.RFC3339),
		DurationSeconds: int(finishedAt.Sub(startedAt).Seconds()),
		OperatorName:    executionOperator(trigger),
	}
	s.nextExecID++
	s.executions[activeID] = append([]view.RespReportExecutionRecord{execution}, s.executions[activeID]...)
	delivery := mergeDeliverySummary(s.deliveries[activeID], channelResults)
	s.deliveries[activeID] = delivery

	return view.RespReportPreviewRunResult{
		Preview:   preview,
		Execution: execution,
		Delivery:  delivery,
	}, nil
}

func (s *Service) StartScheduler() error {
	if s.scheduler != nil {
		return nil
	}
	scheduler := NewScheduler(s)
	if err := scheduler.Start(); err != nil {
		return err
	}
	s.scheduler = scheduler
	return nil
}

func (s *Service) StopScheduler() {
	if s.scheduler == nil {
		return
	}
	s.scheduler.Stop()
	s.scheduler = nil
}

func (s *Service) buildScheduleRuntime(item view.RespReportListItem, executions []view.RespReportExecutionRecord) view.RespReportScheduleRuntime {
	runtime := view.RespReportScheduleRuntime{
		Paused: item.Status == "paused",
	}

	if s.scheduler != nil {
		registered, nextRunAt := s.scheduler.Snapshot(item.ID)
		runtime.Registered = registered
		if !nextRunAt.IsZero() {
			runtime.NextRunAt = nextRunAt.Format(time.RFC3339)
		}
	}

	for _, record := range executions {
		if record.Trigger != "schedule" {
			continue
		}
		runtime.LastScheduledExecution = &view.RespReportScheduleExecutionSummary{
			Status:       record.Status,
			Trigger:      record.Trigger,
			StartedAt:    record.StartedAt,
			EndedAt:      record.EndedAt,
			OperatorName: record.OperatorName,
		}
		break
	}

	return runtime
}

func (s *Service) resolveReportID(reportID int) (int, error) {
	if s.useDB() {
		return s.resolveReportIDFromDB(reportID)
	}
	if reportID == 0 {
		if len(s.list) == 0 {
			return 0, fmt.Errorf("report workspace not found: empty list")
		}
		return s.list[0].ID, nil
	}
	if _, ok := s.schedules[reportID]; !ok {
		return 0, fmt.Errorf("report workspace not found: %d", reportID)
	}
	return reportID, nil
}

func defaultSeed() seedData {
	return seedData{
		list: []view.RespReportListItem{
			{
				ID:        1001,
				NodeID:    31001,
				Name:      "日报-核心指标概览",
				Desc:      "每天 09:00 推送核心业务指标",
				Status:    "enabled",
				DutyUID:   10086,
				UpdatedAt: "2026-03-28T09:02:00+08:00",
			},
			{
				ID:        1002,
				NodeID:    31002,
				Name:      "周报-异常波动追踪",
				Desc:      "每周一 10:00 推送上周异常波动",
				Status:    "paused",
				DutyUID:   10010,
				UpdatedAt: "2026-03-25T11:20:00+08:00",
			},
		},
		editors: map[int]view.RespReportEditorDraft{
			1001: {
				ReportID:            1001,
				NodeID:              31001,
				Name:                "日报-核心指标概览",
				Desc:                "按天汇总核心服务请求量、错误率与延迟分位。",
				QueryMode:           "sql",
				QueryText:           "SELECT service, count() AS requests, quantile(0.95)(latency) AS p95 FROM logs WHERE env = 'prod' GROUP BY service",
				TemplateKey:         "daily-core-kpi",
				OutputFormat:        "markdown",
				RecipientChannelIDs: []int{201},
			},
			1002: {
				ReportID:            1002,
				NodeID:              31002,
				Name:                "周报-异常波动追踪",
				Desc:                "聚合近 7 天异常峰值，并定位影响最大的服务。",
				QueryMode:           "dsl",
				QueryText:           "service:* AND level:error | stats count() by service, error_code",
				TemplateKey:         "weekly-anomaly",
				OutputFormat:        "image",
				RecipientChannelIDs: []int{201},
			},
		},
		schedules: map[int]view.RespReportSchedule{
			1001: {
				NodeID:        1001,
				Desc:          "核心指标日报任务",
				DutyUID:       10086,
				Cron:          "0 0 9 * * *",
				Typ:           0,
				ChannelIDs:    []int{201},
				IsRetry:       1,
				RetryTimes:    2,
				RetryInterval: 300,
			},
			1002: {
				NodeID:        1002,
				Desc:          "异常波动周报任务",
				DutyUID:       10010,
				Cron:          "0 0 10 * * 1",
				Typ:           1,
				ChannelIDs:    []int{201},
				IsRetry:       0,
				RetryTimes:    0,
				RetryInterval: 0,
			},
		},
		previews: map[int]view.RespReportExecutionPreview{
			1001: {
				ReportID:  1001,
				CanRun:    true,
				NextRunAt: "2026-03-31T09:00:00+08:00",
				LastRunAt: "2026-03-30T09:00:06+08:00",
				Message:   "最近一次执行成功，可手动预览。",
			},
			1002: {
				ReportID:  1002,
				CanRun:    false,
				NextRunAt: "2026-04-06T10:00:00+08:00",
				LastRunAt: "2026-03-24T10:00:12+08:00",
				Message:   "任务暂停中，恢复后可执行预览。",
			},
		},
		executions: map[int][]view.RespReportExecutionRecord{
			1001: {
				{
					ID:              50001,
					ReportID:        1001,
					Status:          "success",
					Trigger:         "schedule",
					StartedAt:       "2026-03-30T09:00:00+08:00",
					EndedAt:         "2026-03-30T09:00:06+08:00",
					DurationSeconds: 6,
					OperatorName:    "system",
				},
				{
					ID:              50002,
					ReportID:        1001,
					Status:          "failed",
					Trigger:         "manual",
					StartedAt:       "2026-03-29T15:10:00+08:00",
					EndedAt:         "2026-03-29T15:10:12+08:00",
					DurationSeconds: 12,
					OperatorName:    "张三",
				},
			},
			1002: {
				{
					ID:              50003,
					ReportID:        1002,
					Status:          "unknown",
					Trigger:         "schedule",
					StartedAt:       "2026-03-24T10:00:00+08:00",
					EndedAt:         "2026-03-24T10:00:12+08:00",
					DurationSeconds: 12,
					OperatorName:    "system",
				},
			},
		},
		deliveries: map[int]view.RespReportSendSummary{
			1001: {
				ReportID: 1001,
				Total:    5,
				Success:  4,
				Failed:   1,
				Channels: []view.RespReportChannelSendSummary{
					{
						ChannelID:  201,
						ChannelTyp: "dingtalk",
						Success:    4,
						Failed:     1,
						LastSentAt: "2026-03-30T09:00:08+08:00",
					},
				},
			},
			1002: {
				ReportID: 1002,
				Total:    1,
				Success:  1,
				Failed:   0,
				Channels: []view.RespReportChannelSendSummary{
					{
						ChannelID:  201,
						ChannelTyp: "dingtalk",
						Success:    1,
						Failed:     0,
						LastSentAt: "2026-03-24T10:00:15+08:00",
					},
				},
			},
		},
		channels: []view.RespReportChannel{
			{
				ID:      201,
				Key:     "ops-dingtalk",
				Name:    "运维钉钉群",
				Typ:     "dingtalk",
				Enabled: true,
				Token:   "mock-dingtalk-token",
				Webhook: "https://oapi.dingtalk.com/robot/send?access_token=mock",
			},
		},
	}
}

func cloneList(source []view.RespReportListItem) []view.RespReportListItem {
	return append([]view.RespReportListItem(nil), source...)
}

func cloneEditorMap(source map[int]view.RespReportEditorDraft) map[int]view.RespReportEditorDraft {
	resp := make(map[int]view.RespReportEditorDraft, len(source))
	for key, value := range source {
		value.RecipientChannelIDs = append([]int(nil), value.RecipientChannelIDs...)
		resp[key] = value
	}
	return resp
}

func cloneScheduleMap(source map[int]view.RespReportSchedule) map[int]view.RespReportSchedule {
	resp := make(map[int]view.RespReportSchedule, len(source))
	for key, value := range source {
		value.ChannelIDs = append([]int(nil), value.ChannelIDs...)
		resp[key] = value
	}
	return resp
}

func clonePreviewMap(source map[int]view.RespReportExecutionPreview) map[int]view.RespReportExecutionPreview {
	resp := make(map[int]view.RespReportExecutionPreview, len(source))
	for key, value := range source {
		resp[key] = value
	}
	return resp
}

func cloneExecutionMap(source map[int][]view.RespReportExecutionRecord) map[int][]view.RespReportExecutionRecord {
	resp := make(map[int][]view.RespReportExecutionRecord, len(source))
	for key, value := range source {
		resp[key] = append([]view.RespReportExecutionRecord(nil), value...)
	}
	return resp
}

func cloneDeliveryMap(source map[int]view.RespReportSendSummary) map[int]view.RespReportSendSummary {
	resp := make(map[int]view.RespReportSendSummary, len(source))
	for key, value := range source {
		value.Channels = append([]view.RespReportChannelSendSummary(nil), value.Channels...)
		resp[key] = value
	}
	return resp
}

func cloneChannelList(source []view.RespReportChannel) []view.RespReportChannel {
	return append([]view.RespReportChannel(nil), source...)
}

func nextExecutionID(source map[int][]view.RespReportExecutionRecord) int {
	maxID := 50000
	for _, records := range source {
		for _, record := range records {
			if record.ID > maxID {
				maxID = record.ID
			}
		}
	}
	return maxID + 1
}

func (s *Service) reportItem(reportID int) (view.RespReportListItem, bool) {
	for _, item := range s.list {
		if item.ID == reportID {
			return item, true
		}
	}
	return view.RespReportListItem{}, false
}

func (s *Service) findChannel(channelID int) (view.RespReportChannel, bool) {
	for _, channel := range s.channels {
		if channel.ID == channelID {
			return channel, true
		}
	}
	return view.RespReportChannel{}, false
}

func buildPreviewPushContent(item view.RespReportListItem, editor view.RespReportEditorDraft, schedule view.RespReportSchedule, startedAt time.Time) (string, string) {
	return buildPreviewPushContentWithRows(item, editor, schedule, startedAt, nil)
}

func buildPreviewPushContentWithRows(item view.RespReportListItem, editor view.RespReportEditorDraft, schedule view.RespReportSchedule, startedAt time.Time, queryRows []map[string]interface{}) (string, string) {
	title := fmt.Sprintf("统计预览｜%s", item.Name)
	description := reportDescription(item, editor)
	source, timeRangeLabel, scopeLabel := reportScopeLabels(editor.Builder)

	sections := make([]string, 0, 5)
	sections = append(sections, fmt.Sprintf("## %s", markdownEscape(item.Name)))
	sections = append(sections, fmt.Sprintf("%s 统计结果如下", startedAt.Format("2006-01-02")))

	if summary := summarizeReportContent(buildSummaryInput(item, editor, startedAt, queryRows)); strings.TrimSpace(summary) != "" {
		sections = append(sections, "### ⚠️ 变化提示\n"+summary)
	}

	sections = append(sections, fmt.Sprintf("### 📊 核心概览\n- 说明：%s\n- 数据源：%s\n- 时间范围：%s\n- 数据范围：%s",
		markdownEscape(description),
		markdownEscape(source),
		markdownEscape(timeRangeLabel),
		markdownEscape(scopeLabel),
	))

	windowLabel := "按报表触发时间统计"
	if windowStart, ok := reportWindowStart(editor.Builder, startedAt); ok {
		windowLabel = fmt.Sprintf("%s ~ %s", windowStart.Format("2006-01-02 15:04:05"), startedAt.Format("2006-01-02 15:04:05"))
	}
	sections = append(sections, fmt.Sprintf("### ⏱️ 执行信息\n- 统计窗口：%s\n- 发送时间：%s",
		markdownEscape(windowLabel),
		startedAt.Format("2006-01-02 15:04:05"),
	))

	return title, strings.Join(sections, "\n\n")
}

func reportDescription(item view.RespReportListItem, editor view.RespReportEditorDraft) string {
	for _, candidate := range []string{editor.Desc, item.Desc, editor.Name, item.Name} {
		if strings.TrimSpace(candidate) != "" {
			return candidate
		}
	}
	return "按报表配置统计"
}

func reportScopeLabels(builder *view.ReqReportBuilder) (source string, timeRangeLabel string, scopeLabel string) {
	if builder == nil {
		return "按查询配置统计", "按查询配置统计", "按查询配置统计"
	}
	source = "按查询配置统计"
	if strings.TrimSpace(builder.Database) != "" && strings.TrimSpace(builder.Table) != "" {
		source = fmt.Sprintf("%s.%s", builder.Database, builder.Table)
	}
	timeRangeLabel = "按查询配置统计"
	if strings.TrimSpace(builder.TimeRange) != "" {
		timeRangeLabel = fmt.Sprintf("最近%s", builder.TimeRange)
	}
	if len(builder.Blocks) > 1 {
		return source, timeRangeLabel, "多条件汇总"
	}
	scopeLabel = normalizeScopeLabel(builder.Where)
	if len(builder.Blocks) == 1 {
		scopeLabel = normalizeScopeLabel(builder.Blocks[0].Where)
	}
	return source, timeRangeLabel, scopeLabel
}

func normalizeScopeLabel(raw string) string {
	normalized := strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(raw)), ""))
	switch normalized {
	case "", "1=1", "(1=1)":
		return "全部数据"
	default:
		return "按报表配置统计"
	}
}

func reportWindowStart(builder *view.ReqReportBuilder, startedAt time.Time) (time.Time, bool) {
	if builder == nil {
		return time.Time{}, false
	}
	duration, err := reportDuration(builder.TimeRange)
	if err != nil {
		return time.Time{}, false
	}
	return startedAt.Add(-duration), true
}

func summarizeReportContent(input reportSummaryInput) string {
	if reportContentSummarizer == nil {
		return ""
	}
	summary, err := reportContentSummarizer.Summarize(input)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(summary)
}

func executionStatus(successCount int, failedCount int) string {
	if successCount > 0 && failedCount > 0 {
		return "partial"
	}
	if failedCount > 0 {
		return "failed"
	}
	if successCount > 0 {
		return "success"
	}
	return "failed"
}

func buildExecutionMessage(trigger string, successCount int, failedCount int) string {
	prefix := "本次手动预览已完成"
	if trigger == "schedule" {
		prefix = "本次定时推送已完成"
	}
	if failedCount == 0 {
		return fmt.Sprintf("%s，%d 个渠道推送成功。", prefix, successCount)
	}
	return fmt.Sprintf("%s，%d 个渠道推送成功，%d 个渠道推送失败。", prefix, successCount, failedCount)
}

func executionOperator(trigger string) string {
	if trigger == "schedule" {
		return "system"
	}
	return "clickvisual"
}

func mergeDeliverySummary(current view.RespReportSendSummary, updates map[int]view.RespReportChannelSendSummary) view.RespReportSendSummary {
	next := current
	next.Channels = append([]view.RespReportChannelSendSummary(nil), current.Channels...)

	indexByChannelID := make(map[int]int, len(next.Channels))
	for idx, item := range next.Channels {
		indexByChannelID[item.ChannelID] = idx
	}

	for channelID, update := range updates {
		next.Total += update.Success + update.Failed
		next.Success += update.Success
		next.Failed += update.Failed
		if idx, ok := indexByChannelID[channelID]; ok {
			item := next.Channels[idx]
			item.Success += update.Success
			item.Failed += update.Failed
			if update.LastSentAt != "" {
				item.LastSentAt = update.LastSentAt
			}
			if update.ChannelTyp != "" {
				item.ChannelTyp = update.ChannelTyp
			}
			next.Channels[idx] = item
			continue
		}
		next.Channels = append(next.Channels, update)
		indexByChannelID[channelID] = len(next.Channels) - 1
	}

	return next
}
