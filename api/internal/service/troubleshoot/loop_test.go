package troubleshoot

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/ai"
)

func useSQLite(t *testing.T) {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	d, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	prevDB := invoker.Db
	prevComplete := completeFn
	prevTables := tables
	prevQueries := queries
	invoker.Db = d
	schemaReady = false
	t.Cleanup(func() {
		invoker.Db = prevDB
		completeFn = prevComplete
		tables = prevTables
		queries = prevQueries
		schemaReady = false
	})
	require.NoError(t, ensureSchema())
}

type fakeCatalog struct {
	items []tableBrief
}

func (f fakeCatalog) List(context.Context, int) ([]tableBrief, error) {
	return f.items, nil
}

func (f fakeCatalog) Describe(_ context.Context, _ int, tid int) (tableDetail, error) {
	for _, item := range f.items {
		if item.ID == tid {
			return tableDetail{tableBrief: item}, nil
		}
	}
	return tableDetail{}, fmt.Errorf("日志表 %d 不存在", tid)
}

func (f fakeCatalog) CheckAccess(ctx context.Context, uid int, tid int) error {
	_, err := f.Describe(ctx, uid, tid)
	return err
}

type fakeRunner struct {
	calls int
}

func (f *fakeRunner) Run(context.Context, int, view.QueryRequestV2) (queryHit, error) {
	f.calls++
	return queryHit{Count: 3, SQL: "select 1", Preview: "1. level=error"}, nil
}

func scripted(replies ...string) completer {
	index := 0
	return func(context.Context, []ai.Message, ai.CompletionOptions) (string, error) {
		if index >= len(replies) {
			return `{"action":"final","text":"没有更多步骤"}`, nil
		}
		reply := replies[index]
		index++
		return reply, nil
	}
}

func testCatalog() fakeCatalog {
	return fakeCatalog{items: []tableBrief{
		{ID: 7, Name: "ego_stdout", Database: "pro_log", InstanceID: 1},
		{ID: 8, Name: "app_stdout", Database: "pro_log", InstanceID: 1},
	}}
}

func TestStartFinalizesWithoutQuery(t *testing.T) {
	useSQLite(t)
	completeFn = scripted(`{"action":"final","text":"先补充 trace id。"}`)
	session, err := Start(context.Background(), 3, "接口超时")
	require.NoError(t, err)
	require.Equal(t, "接口超时", session.Title)
	require.Equal(t, dbmodel.TroubleshootStatusIdle, session.Status)
	require.Len(t, session.Messages, 2)
	require.Equal(t, "先补充 trace id。", session.Messages[1].Text)
}

func TestLargeWindowWaitsUntilConfirmed(t *testing.T) {
	useSQLite(t)
	runner := &fakeRunner{}
	tables = testCatalog()
	queries = runner
	nowFn = func() time.Time { return time.Unix(1_700_000_000, 0) }
	t.Cleanup(func() { nowFn = time.Now })
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1699974800,"et":1700000000,"query":"level = 'error'"}}`,
		`{"action":"final","text":"这 7 小时里有 3 条错误。","query":{"tid":7,"st":1699974800,"et":1700000000,"query":"level = 'error'"}}`,
	)

	session, err := Start(context.Background(), 3, "最近 7 小时的错误")
	require.NoError(t, err)
	require.Equal(t, dbmodel.TroubleshootStatusWaitingConfirm, session.Status)
	require.NotNil(t, session.Pending)
	require.Contains(t, session.Pending.Summary, "超过 6 小时")
	require.Zero(t, runner.calls)

	session, err = Confirm(context.Background(), 3, session.ID, true)
	require.NoError(t, err)
	require.Equal(t, 1, runner.calls)
	require.Equal(t, dbmodel.TroubleshootStatusIdle, session.Status)
	require.Nil(t, session.Pending)
	require.Equal(t, "这 7 小时里有 3 条错误。", session.Messages[len(session.Messages)-1].Text)
	require.NotNil(t, session.Messages[len(session.Messages)-1].Link)
	require.Equal(t, "pro_log", session.Messages[len(session.Messages)-1].Link.Database)
	require.NotNil(t, session.Messages[len(session.Messages)-1].Result)
	require.Contains(t, session.Messages[len(session.Messages)-1].Result.Preview, "level=error")
}

func TestQueryDetailsAreAttachedToAnswerAndPreservedInHistoryAndShare(t *testing.T) {
	useSQLite(t)
	tables = testCatalog()
	queries = &fakeRunner{}
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":1900,"query":"level = 'error'"}}`,
		`{"action":"final","text":"找到错误日志。"}`,
	)
	session, err := Start(context.Background(), 3, "显示错误的具体内容")
	require.NoError(t, err)
	answer := session.Messages[len(session.Messages)-1]
	require.Equal(t, "assistant", answer.Role)
	require.NotNil(t, answer.Result)
	require.EqualValues(t, 3, answer.Result.Count)
	require.Contains(t, answer.Result.Preview, "level=error")

	history, err := GetSession(3, session.ID)
	require.NoError(t, err)
	require.Equal(t, answer.Result, history.Messages[len(history.Messages)-1].Result)
	token, err := Share(3, session.ID)
	require.NoError(t, err)
	shared, err := GetShared(context.Background(), 3, token)
	require.NoError(t, err)
	require.Equal(t, answer.Result, shared.Messages[len(shared.Messages)-1].Result)
}

func TestSharedRejectsAccessWhenTablePermissionIsRevoked(t *testing.T) {
	useSQLite(t)
	tables = testCatalog()
	queries = &fakeRunner{}
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":1900,"query":"level = 'error'"}}`,
		`{"action":"final","text":"找到错误日志。"}`,
	)
	session, err := Start(context.Background(), 3, "显示错误日志")
	require.NoError(t, err)
	token, err := Share(3, session.ID)
	require.NoError(t, err)
	tables = fakeCatalog{}
	shared, err := GetShared(context.Background(), 3, token)
	require.Error(t, err)
	require.Empty(t, shared.Messages)
}

func TestPreviewLogsPreservesRawContentAndFieldsBeyondFirstEight(t *testing.T) {
	row := map[string]interface{}{
		"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6, "g": 7, "h": 8,
		"message":   strings.Repeat("x", 150) + " upstream timeout",
		"trace_id":  "trace-123",
		"_raw_log_": map[string]string{"error": "connection reset by peer"},
	}
	preview := previewLogs([]map[string]interface{}{row}, 8)
	require.Contains(t, preview, strings.Repeat("x", 150))
	require.Contains(t, preview, "connection reset by peer")
	require.Contains(t, preview, "trace-123")
	require.Contains(t, preview, "upstream timeout")
}

func TestPreviewLogsBoundsSamplesAndMarksTruncation(t *testing.T) {
	preview := previewLogs([]map[string]interface{}{
		{"message": "first"}, {"message": "second"},
	}, 1)
	require.Contains(t, preview, "first")
	require.NotContains(t, preview, "second")
	preview = previewLogs([]map[string]interface{}{{"message": strings.Repeat("日志", 5000)}}, 8)
	require.Contains(t, preview, "已截断")
	require.Less(t, len([]rune(preview)), 6100)
}

func TestSwitchingTableRequiresConfirm(t *testing.T) {
	useSQLite(t)
	runner := &fakeRunner{}
	tables = testCatalog()
	queries = runner
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":1900,"query":"level = 'error'"}}`,
		`{"action":"final","text":"这张表里有 3 条。"}`,
		`{"action":"tool","name":"run_query","args":{"tid":8,"st":1000,"et":1900,"query":"level = 'error'"}}`,
	)

	session, err := Start(context.Background(), 3, "先看 stdout")
	require.NoError(t, err)
	require.Equal(t, dbmodel.TroubleshootStatusIdle, session.Status)
	require.Equal(t, 1, runner.calls)

	session, err = Reply(context.Background(), 3, session.ID, "再看另一张表")
	require.NoError(t, err)
	require.Equal(t, dbmodel.TroubleshootStatusWaitingConfirm, session.Status)
	require.Contains(t, session.Pending.Summary, "切换日志表")
	require.Equal(t, 1, runner.calls)

	_, err = Reply(context.Background(), 3, session.ID, "继续")
	require.ErrorIs(t, err, ErrWaiting)
}

func TestRejectConfirmDoesNotRunQuery(t *testing.T) {
	useSQLite(t)
	runner := &fakeRunner{}
	tables = testCatalog()
	queries = runner
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":44200,"query":"level = 'error'"}}`,
	)

	session, err := Start(context.Background(), 3, "拉长一点看")
	require.NoError(t, err)
	require.Equal(t, dbmodel.TroubleshootStatusWaitingConfirm, session.Status)

	session, err = Confirm(context.Background(), 3, session.ID, false)
	require.NoError(t, err)
	require.Zero(t, runner.calls)
	require.Equal(t, dbmodel.TroubleshootStatusIdle, session.Status)
	require.Equal(t, "canceled", session.Messages[len(session.Messages)-1].Status)
}

func TestNeedsConfirm(t *testing.T) {
	wait, reason := needsConfirm(0, 0, 7, 15*60)
	require.False(t, wait)
	require.Empty(t, reason)

	wait, reason = needsConfirm(0, 0, 7, 7*3600)
	require.True(t, wait)
	require.Contains(t, reason, "6 小时")

	wait, _ = needsConfirm(7, 7*3600, 7, 7*3600)
	require.False(t, wait)

	wait, reason = needsConfirm(7, 7*3600, 8, 15*60)
	require.True(t, wait)
	require.Contains(t, reason, "切换日志表")
}
