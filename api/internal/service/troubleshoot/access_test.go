package troubleshoot

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/ai"
)

type userCatalog struct {
	fakeCatalog
	allowed map[int]map[int]bool
}

type appendingCatalog struct {
	userCatalog
	appendEvidence func()
}

func (f appendingCatalog) CheckAccess(ctx context.Context, uid int, tid int) error {
	f.appendEvidence()
	return f.userCatalog.CheckAccess(ctx, uid, tid)
}

func (f userCatalog) CheckAccess(_ context.Context, uid int, tid int) error {
	if !f.allowed[uid][tid] {
		return ErrPermission
	}
	return nil
}

func (f userCatalog) Describe(ctx context.Context, uid int, tid int) (tableDetail, error) {
	if err := f.CheckAccess(ctx, uid, tid); err != nil {
		return tableDetail{}, err
	}
	return f.fakeCatalog.Describe(ctx, uid, tid)
}

func TestSessionsAreIsolatedByOwner(t *testing.T) {
	useSQLite(t)
	completeFn = scripted(`{"action":"final","text":"请提供更多信息"}`)
	session, err := Start(context.Background(), 3, "用户三的排查")
	require.NoError(t, err)
	owned, err := ListSessions(3)
	require.NoError(t, err)
	require.Len(t, owned, 1)
	other, err := ListSessions(4)
	require.NoError(t, err)
	require.Empty(t, other)
	_, err = GetSession(4, session.ID)
	require.ErrorIs(t, err, ErrNotFound)
	_, err = Reply(context.Background(), 4, session.ID, "读取其他人的对话")
	require.ErrorIs(t, err, ErrNotFound)
	_, err = Confirm(context.Background(), 4, session.ID, true)
	require.ErrorIs(t, err, ErrNotFound)
	_, err = Share(4, session.ID)
	require.ErrorIs(t, err, ErrNotFound)
	rows, err := listMessages(session.ID)
	require.NoError(t, err)
	require.Len(t, rows, 2)
}

func TestSharedRequiresRecipientPermissionsForAllEvidence(t *testing.T) {
	useSQLite(t)
	tables = userCatalog{testCatalog(), map[int]map[int]bool{
		3: {7: true, 8: true},
		4: {7: true},
		5: {7: true, 8: true},
	}}
	queries = &fakeRunner{}
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":1900}}`,
		`{"action":"final","text":"第一张表的日志"}`,
	)
	session, err := Start(context.Background(), 3, "多表排查")
	require.NoError(t, err)
	// Earlier evidence must remain protected even when the final answer links
	// only to another table.
	_, err = addMessage(session.ID, "assistant", "final", "另一张表的证据", mustPayload(messagePayload{
		Link: &view.TroubleshootLink{Tid: 8},
	}))
	require.NoError(t, err)
	token, err := Share(3, session.ID)
	require.NoError(t, err)
	for _, uid := range []int{0, 4, 6} {
		t.Run(fmt.Sprintf("denied_%d", uid), func(t *testing.T) {
			shared, err := GetShared(context.Background(), uid, token)
			require.ErrorIs(t, err, ErrPermission)
			require.Empty(t, shared.Messages)
		})
	}
	shared, err := GetShared(context.Background(), 5, token)
	require.NoError(t, err)
	require.NotEmpty(t, shared.Messages)
	_, err = GetSession(5, session.ID)
	require.ErrorIs(t, err, ErrNotFound)
	_, err = Reply(context.Background(), 5, session.ID, "共享对话不能编辑")
	require.ErrorIs(t, err, ErrNotFound)
}

func TestStoredMetadataAlsoRequiresPermission(t *testing.T) {
	for _, name := range []string{toolListTables, toolDescribeTable} {
		t.Run(name, func(t *testing.T) {
			useSQLite(t)
			tables = userCatalog{testCatalog(), map[int]map[int]bool{
				3: {7: true, 8: true},
				4: {7: true},
			}}
			completeFn = scripted(`{"action":"final","text":"日志表信息"}`)
			session, err := Start(context.Background(), 3, "查看日志字段")
			require.NoError(t, err)
			content := `{"tid":8,"columns":[{"field":"private_field"}]}`
			if name == toolListTables {
				content = `[{"tid":7},{"tid":8}]`
			}
			_, err = addMessage(session.ID, "tool", "tool", content, mustPayload(messagePayload{Tool: name, Status: "done"}))
			require.NoError(t, err)
			token, err := Share(3, session.ID)
			require.NoError(t, err)
			_, err = GetShared(context.Background(), 4, token)
			require.ErrorIs(t, err, ErrPermission)
		})
	}
}

func TestSharedReturnsOnlyThePermissionCheckedSnapshot(t *testing.T) {
	useSQLite(t)
	catalog := userCatalog{testCatalog(), map[int]map[int]bool{3: {7: true, 8: true}, 4: {7: true}}}
	tables = catalog
	queries = &fakeRunner{}
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":1900}}`,
		`{"action":"final","text":"允许查看的证据"}`,
	)
	session, err := Start(context.Background(), 3, "排查")
	require.NoError(t, err)
	token, err := Share(3, session.ID)
	require.NoError(t, err)
	tables = appendingCatalog{catalog, func() {
		_, err := addMessage(session.ID, "assistant", "final", "新加入的私密日志", mustPayload(messagePayload{Link: &view.TroubleshootLink{Tid: 8}}))
		require.NoError(t, err)
	}}
	shared, err := GetShared(context.Background(), 4, token)
	require.NoError(t, err)
	for _, message := range shared.Messages {
		require.NotContains(t, message.Text, "新加入的私密日志")
	}
}

func TestRevokedPermissionsBlockHistoryAndModelContext(t *testing.T) {
	useSQLite(t)
	tables = testCatalog()
	runner := &fakeRunner{}
	queries = runner
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":1900}}`,
		`{"action":"final","text":"日志证据"}`,
	)
	session, err := Start(context.Background(), 3, "查看日志")
	require.NoError(t, err)
	tables = fakeCatalog{}
	_, err = GetSession(3, session.ID)
	require.ErrorIs(t, err, ErrPermission)
	_, err = Share(3, session.ID)
	require.ErrorIs(t, err, ErrPermission)
	completeFn = func(context.Context, []ai.Message, ai.CompletionOptions) (string, error) {
		t.Fatal("revoked log evidence must not be sent to the model")
		return "", nil
	}
	_, err = Reply(context.Background(), 3, session.ID, "继续分析")
	require.ErrorIs(t, err, ErrPermission)
	require.Equal(t, 1, runner.calls)
}

func TestConfirmRechecksPermissionsAndDeniedQueriesDoNotLockConversation(t *testing.T) {
	useSQLite(t)
	tables = testCatalog()
	runner := &fakeRunner{}
	queries = runner
	completeFn = scripted(`{"action":"tool","name":"run_query","args":{"tid":7,"st":1000,"et":44200}}`)
	session, err := Start(context.Background(), 3, "需要确认的查询")
	require.NoError(t, err)
	tables = fakeCatalog{}
	_, err = Confirm(context.Background(), 3, session.ID, true)
	require.ErrorIs(t, err, ErrPermission)
	require.Zero(t, runner.calls)

	// An unauthorized table selected by the model must not query data or
	// prevent the user from continuing a conversation that has no evidence.
	completeFn = scripted(
		`{"action":"tool","name":"run_query","args":{"tid":8,"st":1000,"et":1900}}`,
		`{"action":"final","text":"没有权限"}`,
	)
	denied, err := Start(context.Background(), 3, "无权限表")
	require.NoError(t, err)
	_, err = GetSession(3, denied.ID)
	require.NoError(t, err)
	_, err = Reply(context.Background(), 3, denied.ID, "换个问题")
	require.NoError(t, err)
	require.Zero(t, runner.calls)
}

func TestSharedRejectsUnreadableEvidenceMetadata(t *testing.T) {
	useSQLite(t)
	session := dbmodel.TroubleshootSession{UID: 3, ShareToken: "broken"}
	require.NoError(t, invoker.Db.Create(&session).Error)
	_, err := addMessage(session.ID, "tool", "tool", "broken metadata", mustPayload(messagePayload{Tool: toolListTables, Status: "done"}))
	require.NoError(t, err)
	_, err = GetShared(context.Background(), 3, "broken")
	require.ErrorIs(t, err, ErrPermission)
}

func TestQueryToolsUseConversationOwnerIdentity(t *testing.T) {
	useSQLite(t)
	tables = userCatalog{testCatalog(), map[int]map[int]bool{3: {7: true}}}
	runner := &fakeRunner{}
	queries = runner
	session := &dbmodel.TroubleshootSession{UID: 4}
	args, err := json.Marshal(queryArgs{Tid: 7, ST: 1000, ET: 1900})
	require.NoError(t, err)
	outcome := runQuery(context.Background(), session, args, true)
	require.Equal(t, "error", outcome.Status)
	require.Zero(t, runner.calls)
}
