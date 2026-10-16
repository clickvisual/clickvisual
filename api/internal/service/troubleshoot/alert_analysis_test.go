package troubleshoot

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service/ai"
)

func alertSeed() AlertSeed {
	return AlertSeed{Title: "API errors", Description: "5XX threshold", Tid: 7, Query: "level = 'error'", Start: 1000, End: 1900}
}

func TestAnalyzeAlertSeedsEvidenceAndHidesMachineSession(t *testing.T) {
	useSQLite(t)
	runner := &fakeRunner{}
	queries = runner
	tables = testCatalog()
	completeFn = scripted(`{"action":"final","text":"已有日志证据，尚不能确定全部错误的原因"}`)
	result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
	require.NoError(t, err)
	require.Contains(t, result.Summary, "已有日志证据")
	require.NotEmpty(t, result.Snapshot)
	require.Equal(t, 1, runner.calls)
	history, err := ListSessions(3)
	require.NoError(t, err)
	require.Empty(t, history)
	var background dbmodel.TroubleshootSession
	require.NoError(t, invoker.Db.First(&background).Error)
	_, err = GetSession(3, background.ID)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestAnalyzeAlertRequestsReadableNotificationSections(t *testing.T) {
	useSQLite(t)
	queries = &fakeRunner{}
	tables = testCatalog()
	completeFn = func(_ context.Context, messages []ai.Message, options ai.CompletionOptions) (string, error) {
		for _, heading := range []string{"**结论**", "**关键证据**", "**待确认**", "**建议**"} {
			require.Contains(t, messages[0].Content, heading)
		}
		require.Contains(t, messages[0].Content, "Markdown 和换行放在 text 字符串内")
		require.Equal(t, 1800, options.MaxTokens)
		return `{"action":"final","text":"**结论**\n发现慢请求。\n\n**关键证据**\n- 有三条日志。\n\n**待确认**\n影响范围未知。\n\n**建议**\n- 检查下游。"}`, nil
	}
	result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
	require.NoError(t, err)
	require.Contains(t, result.Summary, "**关键证据**\n- 有三条日志。")
	var snapshot alertSnapshot
	require.NoError(t, json.Unmarshal([]byte(result.Snapshot), &snapshot))
	require.Equal(t, result.Summary, snapshot.Messages[len(snapshot.Messages)-1].Content)
}

func TestAnalyzeAlertAllowsAuthorizedBoundedRelatedQueries(t *testing.T) {
	useSQLite(t)
	runner := &fakeRunner{}
	queries = runner
	tables = userCatalog{testCatalog(), map[int]map[int]bool{3: {7: true, 8: true}}}
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":8,"st":1100,"et":1800,"query":"trace_id = 't1'"}}`,
		`{"action":"final","text":"关联日志支持下游错误结论"}`,
	)
	result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
	require.NoError(t, err)
	require.Equal(t, 2, runner.calls)
	require.Contains(t, result.Summary, "关联日志")
}

func TestAnalyzeAlertRejectsWindowExpansionAndModelFailure(t *testing.T) {
	t.Run("bounded queries", func(t *testing.T) {
		useSQLite(t)
		runner := &fakeRunner{}
		queries = runner
		tables = testCatalog()
		completeFn = scripted(
			`{"action":"tool","name":"run_query","args":{"tid":7,"st":1,"et":1900}}`,
			`{"action":"final","text":"只使用告警窗口内已有证据"}`,
		)
		_, err := AnalyzeAlert(context.Background(), 3, alertSeed())
		require.NoError(t, err)
		require.Equal(t, 1, runner.calls)
	})
	t.Run("failure is not a conclusion", func(t *testing.T) {
		useSQLite(t)
		queries = &fakeRunner{}
		tables = testCatalog()
		completeFn = func(context.Context, []ai.Message, ai.CompletionOptions) (string, error) {
			return "", errors.New("upstream unavailable")
		}
		result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
		require.ErrorContains(t, err, "upstream unavailable")
		require.Empty(t, result.Snapshot)
	})
}

func TestAnalyzeAlertRequiresOwnerAccessBeforeQueries(t *testing.T) {
	useSQLite(t)
	runner := &fakeRunner{}
	queries = runner
	tables = userCatalog{testCatalog(), map[int]map[int]bool{}}
	_, err := AnalyzeAlert(context.Background(), 3, alertSeed())
	require.ErrorIs(t, err, ErrPermission)
	require.Zero(t, runner.calls)
}

func TestAnalyzeAlertRejectsEmptyModelConclusion(t *testing.T) {
	for _, completion := range []string{"", `{"action":"final","text":""}`} {
		t.Run(completion, func(t *testing.T) {
			useSQLite(t)
			queries = &fakeRunner{}
			tables = testCatalog()
			completeFn = scripted(completion)
			result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
			require.Error(t, err)
			require.Empty(t, result.Snapshot)
		})
	}
}

func TestAnalyzeAlertKeepsRawSamplesInAskRatherThanChannelSummary(t *testing.T) {
	useSQLite(t)
	queries = &fakeRunner{}
	tables = testCatalog()
	completeFn = scripted(`{"action":"final","text":"发现错误。原始样本：1. level=error"}`)
	result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
	require.NoError(t, err)
	require.NotContains(t, result.Summary, "1. level=error")
	require.Contains(t, result.Snapshot, "1. level=error")
}

func TestAnalyzeAlertNormalizesLegacyEvidenceFilters(t *testing.T) {
	for _, filter := range []string{"1=1", "SELECT count() FROM logs WHERE level='error'", "length(message) > 10"} {
		t.Run(filter, func(t *testing.T) {
			useSQLite(t)
			queries = &fakeRunner{}
			tables = testCatalog()
			completeFn = scripted(`{"action":"final","text":"已分析日志样本"}`)
			seed := alertSeed()
			seed.Query = filter
			result, err := AnalyzeAlert(context.Background(), 3, seed)
			require.NoError(t, err)
			var snapshot alertSnapshot
			require.NoError(t, json.Unmarshal([]byte(result.Snapshot), &snapshot))
			var payload messagePayload
			require.NoError(t, json.Unmarshal([]byte(snapshot.Messages[2].Payload), &payload))
			require.Empty(t, payload.Link.Query)
			if filter != "1=1" {
				require.Contains(t, result.Summary, "时间窗口样本")
			}
		})
	}
}

func savedAlertAnalysis(t *testing.T) dbmodel.AlarmAIAnalysis {
	t.Helper()
	tables = userCatalog{testCatalog(), map[int]map[int]bool{
		3: {7: true, 8: true}, 4: {7: true}, 5: {7: true, 8: true},
	}}
	queries = &fakeRunner{}
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":8,"st":1000,"et":1900}}`,
		`{"action":"final","text":"已定位一条关联失败链路"}`,
	)
	result, err := AnalyzeAlert(context.Background(), 3, alertSeed())
	require.NoError(t, err)
	analysis := dbmodel.AlarmAIAnalysis{Token: strings.Repeat("c", 32), Snapshot: result.Snapshot}
	require.NoError(t, invoker.Db.Create(&analysis).Error)
	return analysis
}

func TestAlertContinuationCreatesIndependentPersonalSessions(t *testing.T) {
	useSQLite(t)
	analysis := savedAlertAnalysis(t)
	first, err := StartFromAlert(context.Background(), 3, analysis.Token, strings.Repeat("a", 32))
	require.NoError(t, err)
	other, err := StartFromAlert(context.Background(), 5, analysis.Token, strings.Repeat("a", 32))
	require.NoError(t, err)
	again, err := StartFromAlert(context.Background(), 3, analysis.Token, strings.Repeat("b", 32))
	require.NoError(t, err)
	require.NotEqual(t, first.ID, other.ID)
	require.NotEqual(t, first.ID, again.ID)
	require.Contains(t, first.Messages[len(first.Messages)-1].Text, "关联失败链路")
	_, err = GetSession(5, first.ID)
	require.ErrorIs(t, err, ErrNotFound)
	completeFn = scripted(`{"action":"final","text":"继续排查后的新结论"}`)
	_, err = Reply(context.Background(), 5, other.ID, "现在还在发生吗")
	require.NoError(t, err)
	unchanged, err := GetSession(3, first.ID)
	require.NoError(t, err)
	require.Equal(t, len(first.Messages), len(unchanged.Messages))
}

func TestAlertContinuationRetriesReuseOnlyTheSameUsersRequest(t *testing.T) {
	useSQLite(t)
	analysis := savedAlertAnalysis(t)
	id := strings.Repeat("a", 32)
	first, err := StartFromAlert(context.Background(), 3, analysis.Token, id)
	require.NoError(t, err)
	second, err := StartFromAlert(context.Background(), 3, analysis.Token, id)
	require.NoError(t, err)
	require.Equal(t, first.ID, second.ID)
	var sessions int64
	require.NoError(t, invoker.Db.Model(&dbmodel.TroubleshootSession{}).Where("uid = ? AND source = ?", 3, "").Count(&sessions).Error)
	require.EqualValues(t, 1, sessions)
}

func TestAlertContinuationChecksEveryEvidenceTableBeforeImport(t *testing.T) {
	useSQLite(t)
	analysis := savedAlertAnalysis(t)
	for _, uid := range []int{0, 4, 6} {
		result, err := StartFromAlert(context.Background(), uid, analysis.Token, strings.Repeat("a", 32))
		require.ErrorIs(t, err, ErrPermission)
		require.Empty(t, result.Messages)
	}
	var imports int64
	require.NoError(t, invoker.Db.Model(&dbmodel.AlarmAIFork{}).Count(&imports).Error)
	require.Zero(t, imports)
}

func TestAlertContinuationRechecksPermissionsOnRetry(t *testing.T) {
	useSQLite(t)
	analysis := savedAlertAnalysis(t)
	id := strings.Repeat("a", 32)
	_, err := StartFromAlert(context.Background(), 5, analysis.Token, id)
	require.NoError(t, err)
	tables = userCatalog{testCatalog(), map[int]map[int]bool{5: {7: true}}}
	_, err = StartFromAlert(context.Background(), 5, analysis.Token, id)
	require.ErrorIs(t, err, ErrPermission)
}
