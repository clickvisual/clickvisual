package report

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	sourcesvc "github.com/clickvisual/clickvisual/api/internal/service/source"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const workspaceExecutionLimit = 20

type executionStage string

const (
	executionStageConfig executionStage = "config"
	executionStageQuery  executionStage = "query"
	executionStageRender executionStage = "render"
	executionStageSend   executionStage = "send"
)

type executionPipelineResult struct {
	status          string
	errorSummary    string
	renderedTitle   string
	renderedContent string
	channelResults  []reportChannelSendResult
	successCount    int
	failedCount     int
}

type reportChannelSendResult struct {
	ChannelID     int      `json:"channelId"`
	ChannelTyp    string   `json:"channelTyp"`
	Success       int      `json:"success"`
	Failed        int      `json:"failed"`
	LastSentAt    string   `json:"lastSentAt"`
	Attempts      int      `json:"attempts"`
	Retried       int      `json:"retried"`
	RetryTimes    int      `json:"retryTimes"`
	RetryInterval int      `json:"retryInterval"`
	Errors        []string `json:"errors,omitempty"`
}

type reportQuerySource string

const (
	reportQuerySourceDirect         reportQuerySource = "direct"
	reportQuerySourceAggregation    reportQuerySource = "aggregation"
	reportQuerySourceDirectFallback reportQuerySource = "direct-fallback"
)

func (s *Service) useDB() bool {
	return invoker.Db != nil
}

func (s *Service) upsertReportFromDB(req view.ReqReportDefinition) (view.RespReportDefinition, error) {
	if strings.TrimSpace(req.Name) == "" {
		return view.RespReportDefinition{}, fmt.Errorf("name 不能为空")
	}

	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = dbmodel.ReportStatusEnabled
	}
	queryMode := strings.TrimSpace(req.QueryMode)
	if queryMode == "" {
		queryMode = dbmodel.ReportQueryModeSQL
	}
	outputFormat := strings.TrimSpace(req.OutputFormat)
	if outputFormat == "" {
		outputFormat = dbmodel.ReportOutputFormatMarkdown
	}
	builderConfig := marshalReportBuilder(req.Builder)
	templateKey := strings.TrimSpace(req.TemplateKey)
	if templateKey == "" {
		templateKey = "default-template"
	}

	if req.ReportID > 0 {
		_, err := s.getReportByIDFromDB(req.ReportID)
		if err != nil {
			return view.RespReportDefinition{}, err
		}
		updates := map[string]interface{}{
			"name":           req.Name,
			"desc":           req.Desc,
			"status":         status,
			"query_mode":     queryMode,
			"query_text":     req.QueryText,
			"builder_config": builderConfig,
			"template_key":   templateKey,
			"output_format":  outputFormat,
			"duty_uid":       req.DutyUID,
		}
		if err = invoker.Db.Model(&dbmodel.Report{}).Where("id = ?", req.ReportID).Updates(updates).Error; err != nil {
			return view.RespReportDefinition{}, err
		}
		report, err := s.getReportByIDFromDB(req.ReportID)
		if err != nil {
			return view.RespReportDefinition{}, err
		}
		if err = s.ensureReportAccelerationForReport(report); err != nil {
			return view.RespReportDefinition{}, err
		}
		s.mu.RLock()
		shouldReload := s.scheduler != nil
		s.mu.RUnlock()
		if shouldReload {
			if err = s.scheduler.Reload(req.ReportID); err != nil {
				return view.RespReportDefinition{}, err
			}
		}
		return toRespReportDefinition(report), nil
	}

	report := dbmodel.Report{
		Name:          req.Name,
		Desc:          req.Desc,
		Status:        status,
		QueryMode:     queryMode,
		QueryText:     req.QueryText,
		BuilderConfig: builderConfig,
		TemplateKey:   templateKey,
		OutputFormat:  outputFormat,
		DutyUID:       req.DutyUID,
		CreatorUID:    req.CreatorUID,
	}
	if err := invoker.Db.Model(&dbmodel.Report{}).Create(&report).Error; err != nil {
		return view.RespReportDefinition{}, err
	}
	if err := s.ensureReportAccelerationForReport(report); err != nil {
		return view.RespReportDefinition{}, err
	}
	return toRespReportDefinition(report), nil
}

func (s *Service) getReportFromDB(reportID int) (view.RespReportDefinition, error) {
	if reportID == 0 {
		return view.RespReportDefinition{}, fmt.Errorf("reportId 不能为空")
	}
	report, err := s.getReportByIDFromDB(reportID)
	if err != nil {
		return view.RespReportDefinition{}, err
	}
	return toRespReportDefinition(report), nil
}

func (s *Service) deleteReportFromDB(reportID int) (view.RespReportDeleteResult, error) {
	if reportID == 0 {
		return view.RespReportDeleteResult{}, fmt.Errorf("reportId 不能为空")
	}
	if _, err := s.getReportByIDFromDB(reportID); err != nil {
		return view.RespReportDeleteResult{}, err
	}
	acceleration, hasAcceleration, err := s.getReportAccelerationByReportIDFromDB(reportID)
	if err != nil {
		return view.RespReportDeleteResult{}, err
	}

	err = invoker.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("report_id = ?", reportID).Delete(&dbmodel.ReportSchedule{}).Error; err != nil {
			return err
		}
		if err := tx.Where("report_id = ?", reportID).Delete(&dbmodel.ReportExecution{}).Error; err != nil {
			return err
		}
		if err := tx.Where("report_id = ?", reportID).Delete(&dbmodel.ReportAcceleration{}).Error; err != nil {
			return err
		}
		result := tx.Where("id = ?", reportID).Delete(&dbmodel.Report{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return fmt.Errorf("report not found: %d", reportID)
		}
		return nil
	})
	if err != nil {
		return view.RespReportDeleteResult{}, err
	}

	s.mu.RLock()
	shouldUnload := s.scheduler != nil
	s.mu.RUnlock()
	if shouldUnload {
		s.scheduler.Remove(reportID)
	}
	if hasAcceleration {
		s.cleanupReportAcceleration(acceleration)
	}

	return view.RespReportDeleteResult{ReportID: reportID}, nil
}

func (s *Service) upsertScheduleFromDB(req view.ReqReportSchedule) (view.RespReportSchedule, error) {
	if req.NodeID == 0 {
		return view.RespReportSchedule{}, fmt.Errorf("nodeId 不能为空")
	}
	if len(req.ChannelIDs) == 0 {
		return view.RespReportSchedule{}, fmt.Errorf("channelIds 不能为空")
	}

	report, err := s.getReportByIDFromDB(req.NodeID)
	if err != nil {
		return view.RespReportSchedule{}, err
	}

	schedule := dbmodel.ReportSchedule{
		ReportID:      req.NodeID,
		Cron:          req.Cron,
		Status:        reportScheduleStatusByTyp(req.Typ),
		ChannelIDs:    append([]int(nil), req.ChannelIDs...),
		IsRetry:       req.IsRetry,
		RetryTimes:    req.RetryTimes,
		RetryInterval: req.RetryInterval,
	}
	now := time.Now().Unix()
	err = invoker.Db.Model(&dbmodel.ReportSchedule{}).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "report_id"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"cron":           schedule.Cron,
			"status":         schedule.Status,
			"channel_ids":    schedule.ChannelIDs,
			"is_retry":       schedule.IsRetry,
			"retry_times":    schedule.RetryTimes,
			"retry_interval": schedule.RetryInterval,
			"utime":          now,
		}),
	}).Create(&schedule).Error
	if err != nil {
		return view.RespReportSchedule{}, err
	}

	s.mu.RLock()
	shouldReload := s.scheduler != nil
	s.mu.RUnlock()
	if shouldReload {
		if err = s.scheduler.Reload(req.NodeID); err != nil {
			return view.RespReportSchedule{}, err
		}
	}
	return toRespReportSchedule(report, schedule), nil
}

func (s *Service) getScheduleFromDB(nodeID int) (view.RespReportSchedule, error) {
	if nodeID == 0 {
		return view.RespReportSchedule{}, fmt.Errorf("nodeId 不能为空")
	}
	report, err := s.getReportByIDFromDB(nodeID)
	if err != nil {
		return view.RespReportSchedule{}, err
	}
	schedule, found, err := s.getScheduleByReportIDFromDB(nodeID)
	if err != nil {
		return view.RespReportSchedule{}, err
	}
	if !found {
		return view.RespReportSchedule{}, fmt.Errorf("report schedule not found: %d", nodeID)
	}
	return toRespReportSchedule(report, schedule), nil
}

func (s *Service) getWorkspaceFromDB(reportID int) (view.RespReportWorkspace, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		if err.Error() == "report workspace not found: empty list" {
			channels, channelErr := s.listChannelsFromDB()
			if channelErr != nil {
				return view.RespReportWorkspace{}, channelErr
			}
			return buildEmptyWorkspace(channels), nil
		}
		return view.RespReportWorkspace{}, err
	}

	list, err := s.listReportsFromDB()
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	report, err := s.getReportByIDFromDB(activeID)
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	schedule, found, err := s.getScheduleByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	if !found {
		schedule = dbmodel.ReportSchedule{ReportID: activeID}
	}
	editor := toRespReportEditor(report, schedule)
	scheduleResp := toRespReportSchedule(report, schedule)
	executions, err := s.listExecutionsByReportIDFromDB(activeID, workspaceExecutionLimit)
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	executionResp := toRespExecutionList(executions)
	channels, err := s.listChannelsFromDB()
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	acceleration, foundAcceleration, err := s.getReportAccelerationByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	preview, err := s.getPreviewFromDB(activeID)
	if err != nil {
		return view.RespReportWorkspace{}, err
	}
	delivery, err := s.getDeliveryFromDB(activeID)
	if err != nil {
		return view.RespReportWorkspace{}, err
	}

	runtime := s.buildScheduleRuntime(toRespReportListItem(report), executionResp)
	return view.RespReportWorkspace{
		ActiveReportID: activeID,
		List:           list,
		Editor:         editor,
		Schedule:       scheduleResp,
		Preview:        preview,
		Executions:     executionResp,
		Delivery:       delivery,
		Channels:       channels,
		Runtime:        runtime,
		Acceleration:   toRespReportAcceleration(acceleration, foundAcceleration),
	}, nil
}

func buildEmptyWorkspace(channels []view.RespReportChannel) view.RespReportWorkspace {
	return view.RespReportWorkspace{
		ActiveReportID: 0,
		List:           []view.RespReportListItem{},
		Editor:         view.RespReportEditorDraft{RecipientChannelIDs: []int{}},
		Schedule:       view.RespReportSchedule{ChannelIDs: []int{}},
		Preview:        view.RespReportExecutionPreview{CanRun: false},
		Executions:     []view.RespReportExecutionRecord{},
		Delivery:       view.RespReportSendSummary{Channels: []view.RespReportChannelSendSummary{}},
		Channels:       channels,
		Runtime:        view.RespReportScheduleRuntime{},
		Acceleration:   view.RespReportAcceleration{},
	}
}

func (s *Service) listReportsFromDB() ([]view.RespReportListItem, error) {
	reports, err := s.listReportModelsFromDB()
	if err != nil {
		return nil, err
	}
	resp := make([]view.RespReportListItem, 0, len(reports))
	for _, report := range reports {
		resp = append(resp, toRespReportListItem(report))
	}
	return resp, nil
}

func (s *Service) getEditorFromDB(reportID int) (view.RespReportEditorDraft, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		return view.RespReportEditorDraft{}, err
	}
	report, err := s.getReportByIDFromDB(activeID)
	if err != nil {
		return view.RespReportEditorDraft{}, err
	}
	schedule, found, err := s.getScheduleByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportEditorDraft{}, err
	}
	if !found {
		schedule = dbmodel.ReportSchedule{ReportID: activeID}
	}
	return toRespReportEditor(report, schedule), nil
}

func (s *Service) getDeliveryFromDB(reportID int) (view.RespReportSendSummary, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		return view.RespReportSendSummary{}, err
	}
	executions, err := s.listExecutionsByReportIDFromDB(activeID, 0)
	if err != nil {
		return view.RespReportSendSummary{}, err
	}
	return aggregateDelivery(activeID, executions), nil
}

func (s *Service) listChannelsFromDB() ([]view.RespReportChannel, error) {
	channels := make([]dbmodel.AlarmChannel, 0)
	if err := invoker.Db.Model(&dbmodel.AlarmChannel{}).
		Where("typ = ?", dbmodel.ChannelDingDing).
		Order("id asc").
		Find(&channels).Error; err != nil {
		return nil, err
	}
	resp := make([]view.RespReportChannel, 0, len(channels))
	for _, channel := range channels {
		if strings.TrimSpace(channel.Key) == "" {
			continue
		}
		resp = append(resp, toRespReportChannel(channel))
	}
	return resp, nil
}

func (s *Service) getPreviewFromDB(reportID int) (view.RespReportExecutionPreview, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		return view.RespReportExecutionPreview{}, err
	}
	report, err := s.getReportByIDFromDB(activeID)
	if err != nil {
		return view.RespReportExecutionPreview{}, err
	}
	schedule, hasSchedule, err := s.getScheduleByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportExecutionPreview{}, err
	}
	acceleration, hasAcceleration, err := s.getReportAccelerationByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportExecutionPreview{}, err
	}

	canRun := hasSchedule &&
		report.Status == dbmodel.ReportStatusEnabled &&
		schedule.Status == dbmodel.ReportScheduleStatusEnabled &&
		len(schedule.ChannelIDs) > 0 &&
		(!isAccelerationManagedReport(report) || acceleration.Status == dbmodel.ReportAccelerationStatusReady)

	nextRunAt := formatUnix(schedule.NextRunAt)
	if nextRunAt == "" {
		s.mu.RLock()
		scheduler := s.scheduler
		s.mu.RUnlock()
		if scheduler != nil {
			registered, next := scheduler.Snapshot(activeID)
			if registered && !next.IsZero() {
				nextRunAt = next.Format(time.RFC3339)
			}
		}
	}

	preview := view.RespReportExecutionPreview{
		ReportID:  activeID,
		CanRun:    canRun,
		NextRunAt: nextRunAt,
		LastRunAt: formatUnix(schedule.LastRunAt),
	}
	latest, err := s.listExecutionsByReportIDFromDB(activeID, 1)
	if err != nil {
		return view.RespReportExecutionPreview{}, err
	}
	preview.Message = previewMessage(report, hasSchedule, schedule, latest, acceleration, hasAcceleration)
	return preview, nil
}

func (s *Service) listExecutionsFromDB(reportID int) ([]view.RespReportExecutionRecord, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		return nil, err
	}
	executions, err := s.listExecutionsByReportIDFromDB(activeID, workspaceExecutionLimit)
	if err != nil {
		return nil, err
	}
	return toRespExecutionList(executions), nil
}

func (s *Service) executeReportFromDB(reportID int, trigger string) (view.RespReportPreviewRunResult, error) {
	activeID, err := s.resolveReportIDFromDB(reportID)
	if err != nil {
		return view.RespReportPreviewRunResult{}, err
	}
	report, err := s.getReportByIDFromDB(activeID)
	if err != nil {
		return view.RespReportPreviewRunResult{}, err
	}
	schedule, hasSchedule, err := s.getScheduleByReportIDFromDB(activeID)
	if err != nil {
		return view.RespReportPreviewRunResult{}, err
	}
	startedAt := s.now()

	runningExec := dbmodel.ReportExecution{
		ReportID:        activeID,
		Trigger:         trigger,
		Status:          dbmodel.ReportExecutionStatusRunning,
		StartedAt:       startedAt.Unix(),
		EndedAt:         0,
		DurationSeconds: 0,
		OperatorName:    executionOperator(trigger),
		ChannelResults:  "[]",
		RenderedTitle:   fmt.Sprintf("报表执行｜%s", report.Name),
		RenderedContent: "",
	}
	if err = invoker.Db.Model(&dbmodel.ReportExecution{}).Create(&runningExec).Error; err != nil {
		return view.RespReportPreviewRunResult{}, err
	}

	pipelineResult := s.runDBExecutionPipeline(report, hasSchedule, schedule, trigger, startedAt)
	finishedAt := s.now()
	rawChannelResults, _ := json.Marshal(pipelineResult.channelResults)

	execUpdates := map[string]interface{}{
		"status":           pipelineResult.status,
		"ended_at":         finishedAt.Unix(),
		"duration_seconds": int(finishedAt.Sub(startedAt).Seconds()),
		"error_message":    pipelineResult.errorSummary,
		"channel_results":  string(rawChannelResults),
		"rendered_title":   pipelineResult.renderedTitle,
		"rendered_content": pipelineResult.renderedContent,
	}
	if err = invoker.Db.Model(&dbmodel.ReportExecution{}).Where("id = ?", runningExec.ID).Updates(execUpdates).Error; err != nil {
		return view.RespReportPreviewRunResult{}, err
	}

	if hasSchedule {
		ups := map[string]interface{}{
			"last_run_at": finishedAt.Unix(),
			"next_run_at": int64(0),
		}
		s.mu.RLock()
		scheduler := s.scheduler
		s.mu.RUnlock()
		if scheduler != nil {
			registered, next := scheduler.Snapshot(activeID)
			if registered && !next.IsZero() {
				ups["next_run_at"] = next.Unix()
			}
		}
		if err = invoker.Db.Model(&dbmodel.ReportSchedule{}).Where("report_id = ?", activeID).Updates(ups).Error; err != nil {
			return view.RespReportPreviewRunResult{}, err
		}
	}

	runningExec.Status = pipelineResult.status
	runningExec.EndedAt = finishedAt.Unix()
	runningExec.DurationSeconds = int(finishedAt.Sub(startedAt).Seconds())
	runningExec.ErrorMessage = pipelineResult.errorSummary
	runningExec.ChannelResults = string(rawChannelResults)
	runningExec.RenderedTitle = pipelineResult.renderedTitle
	runningExec.RenderedContent = pipelineResult.renderedContent

	preview, err := s.getPreviewFromDB(activeID)
	if err != nil {
		return view.RespReportPreviewRunResult{}, err
	}
	delivery, err := s.getDeliveryFromDB(activeID)
	if err != nil {
		return view.RespReportPreviewRunResult{}, err
	}
	return view.RespReportPreviewRunResult{
		Preview: preview,
		Execution: view.RespReportExecutionRecord{
			ID:              runningExec.ID,
			ReportID:        runningExec.ReportID,
			Status:          runningExec.Status,
			Trigger:         runningExec.Trigger,
			StartedAt:       formatUnix(runningExec.StartedAt),
			EndedAt:         formatUnix(runningExec.EndedAt),
			DurationSeconds: runningExec.DurationSeconds,
			OperatorName:    runningExec.OperatorName,
			ErrorMessage:    runningExec.ErrorMessage,
			ChannelResults:  parseChannelResults(runningExec.ChannelResults),
		},
		Delivery: delivery,
	}, nil
}

func (s *Service) runDBExecutionPipeline(report dbmodel.Report, hasSchedule bool, schedule dbmodel.ReportSchedule, trigger string, startedAt time.Time) executionPipelineResult {
	result := executionPipelineResult{
		status:          dbmodel.ReportExecutionStatusFailed,
		renderedTitle:   fmt.Sprintf("CV 报表执行失败｜%s", report.Name),
		renderedContent: "",
		channelResults:  make([]reportChannelSendResult, 0),
	}

	if err := validateExecutionConfig(report, hasSchedule, schedule); err != nil {
		result.errorSummary = stageFailureSummary(executionStageConfig, err)
		result.renderedContent = buildStageFailureContent(executionStageConfig, result.errorSummary, startedAt)
		return result
	}

	queryRows, querySource, err := s.runExecutionQuery(report, startedAt)
	if err != nil {
		result.errorSummary = stageFailureSummary(executionStageQuery, err)
		result.renderedContent = buildStageFailureContent(executionStageQuery, result.errorSummary, startedAt)
		return result
	}

	renderedTitle, renderedContent, err := runRenderStage(report, schedule, startedAt, queryRows, querySource)
	if err != nil {
		result.errorSummary = stageFailureSummary(executionStageRender, err)
		result.renderedContent = buildStageFailureContent(executionStageRender, result.errorSummary, startedAt)
		return result
	}
	result.renderedTitle = renderedTitle
	result.renderedContent = renderedContent

	channels, err := s.listChannelsByIDsFromDB(schedule.ChannelIDs)
	if err != nil {
		result.errorSummary = stageFailureSummary(executionStageSend, err)
		result.renderedContent = buildStageFailureContent(executionStageSend, result.errorSummary, startedAt)
		return result
	}

	channelByID := make(map[int]view.RespReportChannel, len(channels))
	for _, channel := range channels {
		channelByID[channel.ID] = channel
	}
	maxAttempts, retryInterval := resolveRetryPolicy(schedule)

	var firstSendErr error
	for _, channelID := range schedule.ChannelIDs {
		channelResult := reportChannelSendResult{
			ChannelID:  channelID,
			ChannelTyp: "dingtalk",
			RetryTimes: schedule.RetryTimes,
		}

		channel, found := channelByID[channelID]
		if !found {
			if firstSendErr == nil {
				firstSendErr = fmt.Errorf("channel not found: %d", channelID)
			}
			channelResult.Attempts = 1
			channelResult.Failed = 1
			result.failedCount++
			result.channelResults = append(result.channelResults, channelResult)
			continue
		}

		channelResult.ChannelTyp = channel.Typ
		channelResult.RetryInterval = schedule.RetryInterval
		var sendErr error
		for attempt := 1; attempt <= maxAttempts; attempt++ {
			channelResult.Attempts++
			channelResult.LastSentAt = s.now().Format(time.RFC3339)
			sendErr = s.sender.Send(channel, renderedTitle, renderedContent)
			if sendErr == nil {
				channelResult.Success = 1
				result.successCount++
				break
			}
			channelResult.Errors = append(channelResult.Errors, fmt.Sprintf("attempt %d/%d: %s", attempt, maxAttempts, sendErr.Error()))
			if attempt < maxAttempts {
				channelResult.Retried++
				s.sleepRetry(retryInterval)
			}
		}
		if sendErr != nil {
			if firstSendErr == nil {
				firstSendErr = sendErr
			}
			channelResult.Failed = 1
			result.failedCount++
		}
		result.channelResults = append(result.channelResults, channelResult)
	}

	result.status = executionStatus(result.successCount, result.failedCount)
	if result.failedCount > 0 {
		result.errorSummary = stageFailureSummary(
			executionStageSend,
			fmt.Errorf("%s; firstError=%v", buildExecutionMessage(trigger, result.successCount, result.failedCount), firstSendErr),
		)
	}
	return result
}

func resolveRetryPolicy(schedule dbmodel.ReportSchedule) (int, int) {
	maxAttempts := 1
	if schedule.IsRetry == 1 && schedule.RetryTimes > 0 {
		maxAttempts += schedule.RetryTimes
	}
	retryInterval := schedule.RetryInterval
	if retryInterval < 0 {
		retryInterval = 0
	}
	return maxAttempts, retryInterval
}

func (s *Service) sleepRetry(intervalSeconds int) {
	if intervalSeconds <= 0 {
		return
	}
	if s.sleep == nil {
		s.sleep = time.Sleep
	}
	s.sleep(time.Duration(intervalSeconds) * time.Second)
}

func validateExecutionConfig(report dbmodel.Report, hasSchedule bool, schedule dbmodel.ReportSchedule) error {
	if report.Status != dbmodel.ReportStatusEnabled {
		return fmt.Errorf("报表已暂停")
	}
	if !hasSchedule {
		return fmt.Errorf("未配置调度")
	}
	if schedule.Status != dbmodel.ReportScheduleStatusEnabled {
		return fmt.Errorf("调度已暂停")
	}
	if len(schedule.ChannelIDs) == 0 {
		return fmt.Errorf("未配置推送渠道")
	}
	if strings.TrimSpace(report.QueryMode) != dbmodel.ReportQueryModeSQL {
		return fmt.Errorf("仅支持 sql 查询模式，当前为 %s", report.QueryMode)
	}
	if strings.TrimSpace(report.QueryText) == "" {
		return fmt.Errorf("queryText 不能为空")
	}
	return nil
}

func isAccelerationManagedReport(report dbmodel.Report) bool {
	return strings.TrimSpace(report.TemplateKey) == "report-builder-default" && resolveReportBuilder(report) != nil
}

func (s *Service) runExecutionQuery(report dbmodel.Report, startedAt time.Time) ([]map[string]interface{}, reportQuerySource, error) {
	if !isAccelerationManagedReport(report) {
		rows, err := s.runQueryStage(report.QueryText)
		return rows, reportQuerySourceDirect, err
	}
	acceleration, found, err := s.getReportAccelerationByReportIDFromDB(report.ID)
	if err != nil {
		return nil, "", err
	}
	if !found || acceleration.Status != dbmodel.ReportAccelerationStatusReady {
		return s.runDirectExecutionFallback(report, nil)
	}
	hasWindowData, err := s.accelerationWindowHasData(report, acceleration, startedAt)
	if err != nil {
		return s.runDirectExecutionFallback(report, err)
	}
	if !hasWindowData {
		return s.runDirectExecutionFallback(report, fmt.Errorf("聚合窗口无数据"))
	}
	queryText, err := buildAcceleratedReportQuery(report, acceleration, startedAt)
	if err != nil {
		return s.runDirectExecutionFallback(report, err)
	}
	rows, err := s.runQueryStage(queryText)
	if err != nil {
		return s.runDirectExecutionFallback(report, err)
	}
	if len(rows) == 0 {
		return s.runDirectExecutionFallback(report, fmt.Errorf("聚合表返回空结果"))
	}
	return rows, reportQuerySourceAggregation, nil
}

func (s *Service) runDirectExecutionFallback(report dbmodel.Report, reason error) ([]map[string]interface{}, reportQuerySource, error) {
	rows, err := s.runQueryStage(report.QueryText)
	if err != nil {
		if reason != nil {
			return nil, "", fmt.Errorf("聚合查询失败且源表直查失败: aggregation=%v; direct=%w", reason, err)
		}
		return nil, "", err
	}
	return rows, reportQuerySourceDirectFallback, nil
}

func (s *Service) accelerationWindowHasData(report dbmodel.Report, acceleration dbmodel.ReportAcceleration, startedAt time.Time) (bool, error) {
	queryText, err := buildAccelerationWindowAvailabilityQuery(report, acceleration, startedAt)
	if err != nil {
		return false, err
	}
	rows, err := s.runQueryStage(queryText)
	if err != nil {
		return false, err
	}
	if len(rows) == 0 {
		return false, nil
	}
	rowCount, ok := toFloat64(rows[0]["row_count"])
	if !ok {
		return false, fmt.Errorf("invalid aggregation row_count")
	}
	return rowCount > 0, nil
}

func buildAccelerationWindowAvailabilityQuery(report dbmodel.Report, acceleration dbmodel.ReportAcceleration, startedAt time.Time) (string, error) {
	builder := resolveReportBuilder(report)
	if builder == nil {
		return "", fmt.Errorf("报表 builder 不存在")
	}
	_, currentEnd, previousStart, _, err := reportComparisonWindow(builder.TimeRange, startedAt)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(
		"WITH toDateTime('%s', '%s') AS window_start, toDateTime('%s', '%s') AS window_end SELECT count() AS row_count FROM %s WHERE bucket_time >= window_start AND bucket_time < window_end",
		previousStart.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		currentEnd.Format("2006-01-02 15:04:05"),
		reportTimeZoneName,
		quoteTable(acceleration.SourceDatabase, acceleration.TargetTable),
	), nil
}

func (s *Service) runQueryStage(queryText string) ([]map[string]interface{}, error) {
	queryText = strings.TrimSpace(queryText)
	if queryText == "" {
		return nil, fmt.Errorf("queryText 不能为空")
	}
	if strings.Contains(strings.ToLower(queryText), "simulate_query_error") {
		return nil, fmt.Errorf("命中查询失败占位标记 simulate_query_error")
	}
	instance, err := s.getDefaultClickHouseInstance()
	if err != nil {
		return nil, err
	}
	operator := sourcesvc.Instantiate(&sourcesvc.Source{
		DSN: instance.GetDSN(),
		Typ: dbmodel.SourceTypClickHouse,
	})
	if operator == nil {
		return nil, fmt.Errorf("clickhouse operator 初始化失败")
	}
	rows, err := operator.Query(queryText)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func runRenderStage(report dbmodel.Report, schedule dbmodel.ReportSchedule, startedAt time.Time, queryRows []map[string]interface{}, querySource reportQuerySource) (string, string, error) {
	if strings.TrimSpace(report.OutputFormat) != dbmodel.ReportOutputFormatMarkdown {
		return "", "", fmt.Errorf("暂不支持输出格式 %s", report.OutputFormat)
	}
	if strings.Contains(strings.ToLower(report.TemplateKey), "simulate_render_error") {
		return "", "", fmt.Errorf("命中渲染失败占位标记 simulate_render_error")
	}
	reportItem := toRespReportListItem(report)
	editor := toRespReportEditor(report, schedule)
	scheduleResp := toRespReportSchedule(report, schedule)
	title, text := buildPreviewPushContentWithRows(reportItem, editor, scheduleResp, startedAt, queryRows)
	sourceSection := fmt.Sprintf("### ℹ️ 查询来源\n- 当前模式：%s", reportQuerySourceLabel(querySource))
	text = strings.TrimSpace(text + "\n\n" + sourceSection + "\n\n" + renderQueryRowsAsMarkdown(report, queryRows))
	return title, text, nil
}

func reportQuerySourceLabel(source reportQuerySource) string {
	switch source {
	case reportQuerySourceAggregation:
		return "聚合表"
	case reportQuerySourceDirectFallback:
		return "源表直查（降级）"
	default:
		return "源表直查"
	}
}

func renderQueryRowsAsMarkdown(report dbmodel.Report, rows []map[string]interface{}) string {
	if len(rows) == 0 {
		return "### 📋 查询结果\n\n无数据"
	}
	currentLabel, previousLabel := metricValueLabels(report)
	var builder strings.Builder
	builder.WriteString("### 📋 查询结果\n\n")
	// Limit markdown body size to keep webhook payloads bounded.
	const maxRows = 20
	if len(rows) > maxRows {
		rows = rows[:maxRows]
	}
	groupedRows, groupOrder := groupRowsByBlockLabel(rows)
	for groupIndex, blockLabel := range groupOrder {
		if groupIndex > 0 {
			builder.WriteString("\n")
		}
		if blockLabel != "" {
			builder.WriteString("#### ")
			builder.WriteString(markdownEscape(blockLabel))
			builder.WriteString("\n\n")
		}
		blockRows := groupedRows[blockLabel]
		for rowIndex := 0; rowIndex < len(blockRows); rowIndex++ {
			row := blockRows[rowIndex]
			if isStructuredMetricRow(row) {
				if isTopNMetricRow(row) {
					topNRows := []map[string]interface{}{row}
					for rowIndex+1 < len(blockRows) && isSameTopNMetric(blockRows[rowIndex+1], row) {
						rowIndex++
						topNRows = append(topNRows, blockRows[rowIndex])
					}
					builder.WriteString(renderTopNMetricSummaryGroup(topNRows))
					continue
				}
				builder.WriteString(renderMetricSummaryBlock(row, currentLabel, previousLabel))
				continue
			}
			columns := orderedQueryResultColumns(row)
			for _, column := range columns {
				builder.WriteString("  - ")
				builder.WriteString(queryResultColumnLabel(column))
				builder.WriteString("：")
				builder.WriteString(markdownEscape(formatQueryResultValue(column, row[column])))
				builder.WriteString("\n")
			}
			builder.WriteString("\n")
		}
	}
	return strings.TrimSpace(builder.String())
}

func groupRowsByBlockLabel(rows []map[string]interface{}) (map[string][]map[string]interface{}, []string) {
	groupedRows := make(map[string][]map[string]interface{}, len(rows))
	groupOrder := make([]string, 0, len(rows))
	for _, row := range rows {
		blockLabel := strings.TrimSpace(fmt.Sprint(row["block_label"]))
		if _, exists := groupedRows[blockLabel]; !exists {
			groupOrder = append(groupOrder, blockLabel)
		}
		groupedRows[blockLabel] = append(groupedRows[blockLabel], row)
	}
	return groupedRows, groupOrder
}

func orderedQueryResultColumns(row map[string]interface{}) []string {
	preferred := []string{
		"metric_kind",
		"metric_name",
		"current_value",
		"previous_value",
		"ratio_vs_yesterday",
		"top_key",
		"top_value",
	}
	columns := make([]string, 0, len(row))
	seen := make(map[string]struct{}, len(row))
	for _, column := range preferred {
		if _, ok := row[column]; ok {
			columns = append(columns, column)
			seen[column] = struct{}{}
		}
	}
	extras := make([]string, 0, len(row))
	for key := range row {
		if key == "block_label" || key == "block_key" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		extras = append(extras, key)
	}
	sort.Strings(extras)
	return append(columns, extras...)
}

func isStructuredMetricRow(row map[string]interface{}) bool {
	if isTopNMetricRow(row) {
		return true
	}
	_, hasMetricName := row["metric_name"]
	_, hasCurrentValue := row["current_value"]
	return hasMetricName && hasCurrentValue
}

func isTopNMetricRow(row map[string]interface{}) bool {
	return strings.TrimSpace(fmt.Sprint(row["metric_kind"])) == "topn"
}

func isSameTopNMetric(left map[string]interface{}, right map[string]interface{}) bool {
	return isTopNMetricRow(left) &&
		isTopNMetricRow(right) &&
		strings.TrimSpace(fmt.Sprint(left["block_key"])) == strings.TrimSpace(fmt.Sprint(right["block_key"])) &&
		strings.TrimSpace(fmt.Sprint(left["metric_name"])) == strings.TrimSpace(fmt.Sprint(right["metric_name"]))
}

func renderMetricSummaryBlock(row map[string]interface{}, currentLabel string, previousLabel string) string {
	if isTopNMetricRow(row) {
		return renderTopNMetricSummaryBlock(row)
	}
	var builder strings.Builder
	metricName := strings.TrimSpace(fmt.Sprint(row["metric_name"]))
	builder.WriteString("  ∘ ")
	if metricName != "" {
		builder.WriteString(markdownEscape(metricName))
	} else {
		builder.WriteString("指标")
	}
	if currentValue, ok := row["current_value"]; ok {
		builder.WriteString("：")
		builder.WriteString(currentLabel)
		builder.WriteString(" ")
		builder.WriteString(markdownEscape(formatQueryResultValue("current_value", currentValue)))
	}
	if previousValue, ok := row["previous_value"]; ok {
		builder.WriteString("，")
		builder.WriteString(previousLabel)
		builder.WriteString(" ")
		builder.WriteString(markdownEscape(formatQueryResultValue("previous_value", previousValue)))
	}
	if ratio, ok := row["ratio_vs_yesterday"]; ok {
		builder.WriteString("，环比 ")
		builder.WriteString(metricTrendBadge(ratio))
		builder.WriteString(" ")
		builder.WriteString(markdownEscape(formatQueryResultValue("ratio_vs_yesterday", ratio)))
	}

	extras := orderedQueryResultColumns(row)
	for _, column := range extras {
		if column == "metric_name" ||
			column == "current_value" ||
			column == "previous_value" ||
			column == "ratio_vs_yesterday" ||
			column == "metric_kind" ||
			column == "top_key" ||
			column == "top_value" ||
			column == "item_order" {
			continue
		}
		builder.WriteString("，")
		builder.WriteString(queryResultColumnLabel(column))
		builder.WriteString("：")
		builder.WriteString(markdownEscape(formatQueryResultValue(column, row[column])))
	}
	builder.WriteString("\n")
	return builder.String()
}

func metricValueLabels(report dbmodel.Report) (string, string) {
	builder := resolveReportBuilder(report)
	if builder != nil && strings.TrimSpace(builder.TimeRange) == "1d" {
		return "昨日", "前日"
	}
	return "当前", "昨日"
}

func renderTopNMetricSummaryBlock(row map[string]interface{}) string {
	return renderTopNMetricSummaryGroup([]map[string]interface{}{row})
}

func renderTopNMetricSummaryGroup(rows []map[string]interface{}) string {
	var builder strings.Builder
	if len(rows) == 0 {
		return ""
	}
	metricName := strings.TrimSpace(fmt.Sprint(rows[0]["metric_name"]))
	if metricName != "" {
		builder.WriteString("  ∘ ")
		builder.WriteString(markdownEscape(metricName))
		builder.WriteString("\n")
	}
	for _, row := range rows {
		builder.WriteString("    ")
		if rankValue, ok := toFloat64(row["item_order"]); ok && rankValue > 0 {
			builder.WriteString(strconv.Itoa(int(rankValue)))
			builder.WriteString(". ")
		} else {
			builder.WriteString("• ")
		}
		builder.WriteString(markdownEscape(formatQueryResultValue("top_key", row["top_key"])))
		builder.WriteString("：")
		builder.WriteString(markdownEscape(formatQueryResultValue("top_value", row["top_value"])))
		builder.WriteString("\n")
	}
	return builder.String()
}

func metricTrendBadge(value interface{}) string {
	ratio, ok := normalizeRatioValue(value)
	if !ok {
		return "⚪"
	}
	switch {
	case ratio > 0:
		return "🔴"
	case ratio < 0:
		return "🟢"
	default:
		return "🟡"
	}
}

func normalizeRatioValue(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		trimmed := strings.TrimSpace(strings.TrimSuffix(v, "%"))
		if trimmed == "" {
			return 0, false
		}
		if strings.Contains(v, "%") {
			parsed, err := strconv.ParseFloat(trimmed, 64)
			if err != nil {
				return 0, false
			}
			return parsed / 100, true
		}
		parsed, err := strconv.ParseFloat(trimmed, 64)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func queryResultColumnLabel(column string) string {
	switch column {
	case "metric_name":
		return "指标"
	case "current_value":
		return "当前值"
	case "previous_value":
		return "昨日"
	case "ratio_vs_yesterday":
		return "环比"
	case "top_key":
		return "分组值"
	case "top_value":
		return "数值"
	default:
		return column
	}
}

func formatQueryResultValue(column string, value interface{}) string {
	if value == nil {
		return "-"
	}
	if column == "ratio_vs_yesterday" {
		if ratio, ok := toFloat64(value); ok {
			percentage := ratio * 100
			if math.IsNaN(percentage) || math.IsInf(percentage, 0) {
				return "-"
			}
			return strconv.FormatFloat(percentage, 'f', 2, 64) + "%"
		}
		return "-"
	}
	return fmt.Sprint(value)
}

func toFloat64(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int8:
		return float64(v), true
	case int16:
		return float64(v), true
	case int32:
		return float64(v), true
	case int64:
		return float64(v), true
	case uint:
		return float64(v), true
	case uint8:
		return float64(v), true
	case uint16:
		return float64(v), true
	case uint32:
		return float64(v), true
	case uint64:
		return float64(v), true
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func markdownEscape(v string) string {
	v = strings.ReplaceAll(v, "\n", " ")
	v = strings.ReplaceAll(v, "|", "\\|")
	return strings.TrimSpace(v)
}

func (s *Service) getDefaultClickHouseInstance() (dbmodel.BaseInstance, error) {
	var instance dbmodel.BaseInstance
	err := invoker.Db.Model(&dbmodel.BaseInstance{}).
		Where("datasource = ?", dbmodel.DatasourceClickHouse).
		Order("id asc").
		First(&instance).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return dbmodel.BaseInstance{}, fmt.Errorf("clickhouse instance not found")
		}
		return dbmodel.BaseInstance{}, err
	}
	return instance, nil
}

func stageFailureSummary(stage executionStage, err error) string {
	if err == nil {
		return ""
	}
	return fmt.Sprintf("%s: %s", executionStageLabel(stage), err.Error())
}

func buildStageFailureContent(stage executionStage, summary string, startedAt time.Time) string {
	return fmt.Sprintf(
		"### 统计执行失败\n- 关键字：统计\n- 执行时间：%s\n- 失败阶段：%s\n- 错误摘要：%s\n",
		formatReportTime(startedAt),
		executionStageLabel(stage),
		summary,
	)
}

func executionStageLabel(stage executionStage) string {
	switch stage {
	case executionStageConfig:
		return "配置校验"
	case executionStageQuery:
		return "查询阶段"
	case executionStageRender:
		return "渲染阶段"
	case executionStageSend:
		return "发送阶段"
	default:
		return "未知阶段"
	}
}

func (s *Service) resolveReportIDFromDB(reportID int) (int, error) {
	if reportID != 0 {
		_, err := s.getReportByIDFromDB(reportID)
		if err != nil {
			return 0, fmt.Errorf("report workspace not found: %d", reportID)
		}
		return reportID, nil
	}

	var report dbmodel.Report
	err := invoker.Db.Model(&dbmodel.Report{}).Order("id asc").First(&report).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, fmt.Errorf("report workspace not found: empty list")
		}
		return 0, err
	}
	return report.ID, nil
}

func (s *Service) enabledReportIDsFromDB() ([]int, error) {
	type row struct {
		ID int `gorm:"column:id"`
	}
	rows := make([]row, 0)
	if err := invoker.Db.Table(dbmodel.TableNameReport+" AS r").
		Select("r.id").
		Joins("JOIN "+dbmodel.TableNameReportSchedule+" AS s ON s.report_id = r.id").
		Where("r.status = ? AND s.status = ?", dbmodel.ReportStatusEnabled, dbmodel.ReportScheduleStatusEnabled).
		Order("r.id ASC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	ids := make([]int, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	return ids, nil
}

func (s *Service) syncScheduleNextRun(reportID int, next time.Time) error {
	nextRunAt := int64(0)
	if !next.IsZero() {
		nextRunAt = next.Unix()
	}
	return invoker.Db.Model(&dbmodel.ReportSchedule{}).
		Where("report_id = ?", reportID).
		Update("next_run_at", nextRunAt).Error
}

func (s *Service) getReportByIDFromDB(reportID int) (dbmodel.Report, error) {
	var report dbmodel.Report
	err := invoker.Db.Model(&dbmodel.Report{}).Where("id = ?", reportID).First(&report).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return dbmodel.Report{}, fmt.Errorf("report not found: %d", reportID)
		}
		return dbmodel.Report{}, err
	}
	return report, nil
}

func (s *Service) listReportModelsFromDB() ([]dbmodel.Report, error) {
	reports := make([]dbmodel.Report, 0)
	if err := invoker.Db.Model(&dbmodel.Report{}).Order("id asc").Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (s *Service) getScheduleByReportIDFromDB(reportID int) (dbmodel.ReportSchedule, bool, error) {
	var schedule dbmodel.ReportSchedule
	err := invoker.Db.Model(&dbmodel.ReportSchedule{}).Where("report_id = ?", reportID).First(&schedule).Error
	if err == nil {
		return schedule, true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return dbmodel.ReportSchedule{}, false, nil
	}
	return dbmodel.ReportSchedule{}, false, err
}

func (s *Service) listExecutionsByReportIDFromDB(reportID int, limit int) ([]dbmodel.ReportExecution, error) {
	executions := make([]dbmodel.ReportExecution, 0)
	query := invoker.Db.Model(&dbmodel.ReportExecution{}).Where("report_id = ?", reportID).Order("id desc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&executions).Error; err != nil {
		return nil, err
	}
	return executions, nil
}

func (s *Service) listChannelsByIDsFromDB(channelIDs []int) ([]view.RespReportChannel, error) {
	if len(channelIDs) == 0 {
		return []view.RespReportChannel{}, nil
	}
	channels := make([]dbmodel.AlarmChannel, 0)
	if err := invoker.Db.Model(&dbmodel.AlarmChannel{}).
		Where("typ = ? AND id IN ?", dbmodel.ChannelDingDing, channelIDs).
		Find(&channels).Error; err != nil {
		return nil, err
	}
	resp := make([]view.RespReportChannel, 0, len(channels))
	for _, channel := range channels {
		if strings.TrimSpace(channel.Key) == "" {
			continue
		}
		resp = append(resp, toRespReportChannel(channel))
	}
	return resp, nil
}

func toRespReportListItem(report dbmodel.Report) view.RespReportListItem {
	return view.RespReportListItem{
		ID:        report.ID,
		NodeID:    report.ID,
		Name:      report.Name,
		Desc:      report.Desc,
		Status:    report.Status,
		DutyUID:   report.DutyUID,
		UpdatedAt: formatUnix(report.Utime),
	}
}

func toRespReportDefinition(report dbmodel.Report) view.RespReportDefinition {
	return view.RespReportDefinition{
		ReportID:     report.ID,
		Name:         report.Name,
		Desc:         report.Desc,
		Status:       report.Status,
		QueryMode:    report.QueryMode,
		QueryText:    report.QueryText,
		TemplateKey:  report.TemplateKey,
		OutputFormat: report.OutputFormat,
		DutyUID:      report.DutyUID,
		CreatorUID:   report.CreatorUID,
		UpdatedAt:    formatUnix(report.Utime),
		Builder:      resolveReportBuilder(report),
	}
}

func toRespReportAcceleration(acceleration dbmodel.ReportAcceleration, found bool) view.RespReportAcceleration {
	return toRespReportAccelerationWithCheck(acceleration, found, nil)
}

func toRespReportAccelerationCheck(check reportAccelerationCheckResult) view.RespReportAccelerationCheck {
	return view.RespReportAccelerationCheck{
		WindowStart: formatReportTime(check.WindowStart),
		WindowEnd:   formatReportTime(check.WindowEnd),
		Passed:      check.Passed,
		Summary:     check.Summary,
		Blocks:      check.Blocks,
	}
}

func toRespReportAccelerationWithCheck(acceleration dbmodel.ReportAcceleration, found bool, check *reportAccelerationCheckResult) view.RespReportAcceleration {
	if !found {
		return view.RespReportAcceleration{Status: "missing"}
	}
	resp := view.RespReportAcceleration{
		Status:          acceleration.Status,
		TargetTable:     acceleration.TargetTable,
		MVName:          acceleration.MVName,
		ErrorMessage:    acceleration.ErrorMessage,
		BackfillStartAt: formatUnix(acceleration.BackfillStartAt),
		BackfillEndAt:   formatUnix(acceleration.BackfillEndAt),
	}
	if check != nil {
		checkResp := toRespReportAccelerationCheck(*check)
		resp.LastCheck = &checkResp
	}
	return resp
}

func toRespReportEditor(report dbmodel.Report, schedule dbmodel.ReportSchedule) view.RespReportEditorDraft {
	return view.RespReportEditorDraft{
		ReportID:            report.ID,
		NodeID:              report.ID,
		Name:                report.Name,
		Desc:                report.Desc,
		QueryMode:           report.QueryMode,
		QueryText:           report.QueryText,
		TemplateKey:         report.TemplateKey,
		OutputFormat:        report.OutputFormat,
		RecipientChannelIDs: append([]int(nil), schedule.ChannelIDs...),
		Builder:             resolveReportBuilder(report),
	}
}

func toRespReportSchedule(report dbmodel.Report, schedule dbmodel.ReportSchedule) view.RespReportSchedule {
	return view.RespReportSchedule{
		NodeID:        report.ID,
		Desc:          report.Desc,
		DutyUID:       report.DutyUID,
		Cron:          schedule.Cron,
		Typ:           reportScheduleTypByStatus(schedule.Status),
		ChannelIDs:    append([]int(nil), schedule.ChannelIDs...),
		IsRetry:       schedule.IsRetry,
		RetryTimes:    schedule.RetryTimes,
		RetryInterval: schedule.RetryInterval,
	}
}

func toRespReportChannel(channel dbmodel.AlarmChannel) view.RespReportChannel {
	return view.RespReportChannel{
		ID:      channel.ID,
		Key:     channel.Name,
		Name:    channel.Name,
		Typ:     reportChannelType(channel.Typ),
		Enabled: true,
		Token:   "",
		Webhook: channel.Key,
	}
}

func toRespExecutionList(executions []dbmodel.ReportExecution) []view.RespReportExecutionRecord {
	resp := make([]view.RespReportExecutionRecord, 0, len(executions))
	for _, execution := range executions {
		resp = append(resp, view.RespReportExecutionRecord{
			ID:              execution.ID,
			ReportID:        execution.ReportID,
			Status:          execution.Status,
			Trigger:         execution.Trigger,
			StartedAt:       formatUnix(execution.StartedAt),
			EndedAt:         formatUnix(execution.EndedAt),
			DurationSeconds: execution.DurationSeconds,
			OperatorName:    execution.OperatorName,
			ErrorMessage:    execution.ErrorMessage,
			ChannelResults:  parseChannelResults(execution.ChannelResults),
		})
	}
	return resp
}

func aggregateDelivery(reportID int, executions []dbmodel.ReportExecution) view.RespReportSendSummary {
	summary := view.RespReportSendSummary{
		ReportID: reportID,
	}
	channelMap := make(map[int]view.RespReportChannelSendSummary)
	for _, execution := range executions {
		results := parseChannelResults(execution.ChannelResults)
		for _, result := range results {
			summary.Total += result.Success + result.Failed
			summary.Success += result.Success
			summary.Failed += result.Failed
			current := channelMap[result.ChannelID]
			if current.ChannelID == 0 {
				current.ChannelID = result.ChannelID
			}
			if result.ChannelTyp != "" {
				current.ChannelTyp = result.ChannelTyp
			}
			current.Success += result.Success
			current.Failed += result.Failed
			current.LastSentAt = newerTimeString(current.LastSentAt, result.LastSentAt)
			channelMap[result.ChannelID] = current
		}
	}
	summary.Channels = make([]view.RespReportChannelSendSummary, 0, len(channelMap))
	for _, item := range channelMap {
		summary.Channels = append(summary.Channels, item)
	}
	return summary
}

func parseChannelResults(raw string) []view.RespReportChannelSendSummary {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	withDetails := make([]reportChannelSendResult, 0)
	if err := json.Unmarshal([]byte(raw), &withDetails); err == nil {
		resp := make([]view.RespReportChannelSendSummary, 0, len(withDetails))
		for _, item := range withDetails {
			resp = append(resp, view.RespReportChannelSendSummary{
				ChannelID:     item.ChannelID,
				ChannelTyp:    item.ChannelTyp,
				Success:       item.Success,
				Failed:        item.Failed,
				LastSentAt:    item.LastSentAt,
				Attempts:      item.Attempts,
				Retried:       item.Retried,
				RetryTimes:    item.RetryTimes,
				RetryInterval: item.RetryInterval,
				Errors:        append([]string(nil), item.Errors...),
			})
		}
		return resp
	}

	asList := make([]view.RespReportChannelSendSummary, 0)
	if err := json.Unmarshal([]byte(raw), &asList); err == nil {
		return asList
	}
	asMap := make(map[string]view.RespReportChannelSendSummary)
	if err := json.Unmarshal([]byte(raw), &asMap); err == nil {
		resp := make([]view.RespReportChannelSendSummary, 0, len(asMap))
		for _, item := range asMap {
			resp = append(resp, item)
		}
		return resp
	}
	return nil
}

func previewMessage(report dbmodel.Report, hasSchedule bool, schedule dbmodel.ReportSchedule, latest []dbmodel.ReportExecution, acceleration dbmodel.ReportAcceleration, hasAcceleration bool) string {
	if !hasSchedule {
		return "当前报表未配置调度。"
	}
	if report.Status != dbmodel.ReportStatusEnabled || schedule.Status != dbmodel.ReportScheduleStatusEnabled {
		return "任务暂停中，恢复后可执行预览。"
	}
	if len(schedule.ChannelIDs) == 0 {
		return "当前报表未配置推送渠道。"
	}
	if isAccelerationManagedReport(report) {
		if message := accelerationPreviewMessage(acceleration, hasAcceleration); message != "" {
			return message
		}
	}
	if len(latest) == 0 {
		return "最近暂无执行记录，可手动预览。"
	}
	switch latest[0].Status {
	case dbmodel.ReportExecutionStatusSuccess:
		return "最近一次执行成功，可手动预览。"
	case dbmodel.ReportExecutionStatusFailed:
		return "最近一次执行失败，可手动预览重试。"
	case dbmodel.ReportExecutionStatusRunning:
		return "当前报表执行中，请稍后查看结果。"
	case dbmodel.ReportExecutionStatusPartial:
		return "最近一次执行部分成功，可手动预览。"
	default:
		return "最近一次执行已完成，可手动预览。"
	}
}

func reportScheduleStatusByTyp(typ int) string {
	if typ == 1 {
		return dbmodel.ReportScheduleStatusPaused
	}
	return dbmodel.ReportScheduleStatusEnabled
}

func reportScheduleTypByStatus(status string) int {
	if status == dbmodel.ReportScheduleStatusPaused {
		return 1
	}
	return 0
}

func reportChannelType(typ int) string {
	switch typ {
	case dbmodel.ChannelDingDing:
		return "dingtalk"
	case dbmodel.ChannelFeiShu:
		return "feishu"
	case dbmodel.ChannelWeChat:
		return "wechat"
	case dbmodel.ChannelSlack:
		return "slack"
	case dbmodel.ChannelWebHook:
		return "webhook"
	case dbmodel.ChannelTelegram:
		return "telegram"
	default:
		return "unknown"
	}
}

func formatUnix(ts int64) string {
	if ts <= 0 {
		return ""
	}
	return reportDisplayTime(time.Unix(ts, 0)).Format(time.RFC3339)
}

func newerTimeString(a string, b string) string {
	if a == "" {
		return b
	}
	if b == "" {
		return a
	}
	at, aErr := time.Parse(time.RFC3339, a)
	bt, bErr := time.Parse(time.RFC3339, b)
	if aErr != nil || bErr != nil {
		if a >= b {
			return a
		}
		return b
	}
	if at.After(bt) {
		return a
	}
	return b
}
