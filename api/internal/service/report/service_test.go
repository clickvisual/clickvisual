package report

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestRunPreviewSendsToWebhookAndUpdatesDelivery(t *testing.T) {
	ResetForTest()

	payloads := make([]string, 0, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		payloads = append(payloads, string(body))
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	defaultService.channels[0].Webhook = server.URL

	resp, err := RunPreview(1001)
	require.NoError(t, err)
	require.Len(t, payloads, 1)
	assert.Equal(t, "success", resp.Execution.Status)
	assert.Equal(t, 6, resp.Delivery.Total)
	assert.Equal(t, 5, resp.Delivery.Success)
	assert.Equal(t, 1, resp.Delivery.Failed)
	assert.Contains(t, resp.Preview.Message, "1 个渠道推送成功")
	assert.Contains(t, payloads[0], "日报-核心指标概览")
	assert.Contains(t, payloads[0], "daily-core-kpi")
}

func TestRunPreviewRecordsFailureWhenWebhookSendFails(t *testing.T) {
	ResetForTest()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	defaultService.channels[0].Webhook = server.URL

	resp, err := RunPreview(1001)
	require.NoError(t, err)
	assert.Equal(t, "failed", resp.Execution.Status)
	assert.Equal(t, 6, resp.Delivery.Total)
	assert.Equal(t, 4, resp.Delivery.Success)
	assert.Equal(t, 2, resp.Delivery.Failed)
	assert.Contains(t, resp.Preview.Message, "1 个渠道推送失败")
}

func TestRunPreviewReturnsErrorWhenTaskCannotRun(t *testing.T) {
	ResetForTest()

	_, err := RunPreview(1002)
	require.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "不可执行预览"))
}

func TestRunScheduledMarksSystemExecution(t *testing.T) {
	ResetForTest()

	resp, err := RunScheduled(1001)
	require.NoError(t, err)
	assert.Equal(t, "schedule", resp.Execution.Trigger)
	assert.Equal(t, "system", resp.Execution.OperatorName)
	assert.Contains(t, resp.Preview.Message, "定时推送")
}

func TestSchedulerStartRegistersEnabledReportAndRuns(t *testing.T) {
	ResetForTest()

	schedule := defaultService.schedules[1001]
	schedule.Cron = "*/1 * * * * *"
	defaultService.schedules[1001] = schedule
	defaultService.channels[0].Webhook = "https://oapi.dingtalk.com/robot/send?access_token=mock"

	err := defaultService.StartScheduler()
	require.NoError(t, err)
	defer defaultService.StopScheduler()

	require.Eventually(t, func() bool {
		defaultService.mu.RLock()
		defer defaultService.mu.RUnlock()
		records := defaultService.executions[1001]
		if len(records) == 0 {
			return false
		}
		return records[0].Trigger == "schedule"
	}, 2500*time.Millisecond, 200*time.Millisecond)
}

func TestUpsertScheduleReloadsSchedulerWithoutDeadlock(t *testing.T) {
	ResetForTest()

	defaultService.channels[0].Webhook = "https://oapi.dingtalk.com/robot/send?access_token=mock"
	require.NoError(t, defaultService.StartScheduler())
	defer defaultService.StopScheduler()

	done := make(chan error, 1)
	go func() {
		_, err := defaultService.UpsertSchedule(view.ReqReportSchedule{
			NodeID:        1001,
			Desc:          "核心指标日报任务",
			DutyUID:       10086,
			Cron:          "*/5 * * * * *",
			Typ:           0,
			ChannelIDs:    []int{201},
			IsRetry:       1,
			RetryTimes:    2,
			RetryInterval: 300,
		})
		done <- err
	}()

	select {
	case err := <-done:
		require.NoError(t, err)
	case <-time.After(2 * time.Second):
		t.Fatal("UpsertSchedule 在 scheduler 激活时发生死锁")
	}
}

func TestGetWorkspaceIncludesSchedulerRuntime(t *testing.T) {
	ResetForTest()

	schedule := defaultService.schedules[1001]
	schedule.Cron = "*/5 * * * * *"
	defaultService.schedules[1001] = schedule

	err := defaultService.StartScheduler()
	require.NoError(t, err)
	defer defaultService.StopScheduler()

	workspace, err := defaultService.GetWorkspace(1001)
	require.NoError(t, err)
	assert.True(t, workspace.Runtime.Registered)
	assert.False(t, workspace.Runtime.Paused)
	assert.NotEmpty(t, workspace.Runtime.NextRunAt)
	if assert.NotNil(t, workspace.Runtime.LastScheduledExecution) {
		assert.Equal(t, "schedule", workspace.Runtime.LastScheduledExecution.Trigger)
		assert.Equal(t, "success", workspace.Runtime.LastScheduledExecution.Status)
		assert.Equal(t, "system", workspace.Runtime.LastScheduledExecution.OperatorName)
	}
}

func TestGetWorkspaceIncludesPausedRuntimeWhenSchedulerNotRegistered(t *testing.T) {
	ResetForTest()

	workspace, err := defaultService.GetWorkspace(1002)
	require.NoError(t, err)
	assert.False(t, workspace.Runtime.Registered)
	assert.True(t, workspace.Runtime.Paused)
	assert.Empty(t, workspace.Runtime.NextRunAt)
	if assert.NotNil(t, workspace.Runtime.LastScheduledExecution) {
		assert.Equal(t, "schedule", workspace.Runtime.LastScheduledExecution.Trigger)
		assert.Equal(t, "system", workspace.Runtime.LastScheduledExecution.OperatorName)
	}
}
