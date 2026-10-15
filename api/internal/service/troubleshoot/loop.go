package troubleshoot

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/ai"
)

type completer func(context.Context, []ai.Message, ai.CompletionOptions) (string, error)

var (
	completeFn completer   = ai.CompleteText
	tables     catalog     = dbCatalog{}
	queries    queryRunner = dbRunner{}
	nowFn                  = time.Now
)

func ListSessions(uid int) ([]view.RespTroubleshootSession, error) {
	if err := ensureSchema(); err != nil {
		return nil, err
	}
	var rows []dbmodel.TroubleshootSession
	err := invoker.Db.Where("uid = ?", uid).Order("utime desc, id desc").Limit(50).Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]view.RespTroubleshootSession, 0, len(rows))
	for _, row := range rows {
		item, err := sessionView(row, false)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func GetSession(uid int, id int) (view.RespTroubleshootSession, error) {
	if err := ensureSchema(); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	session, err := ownedSession(uid, id)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	return authorizedSessionView(context.Background(), uid, *session)
}

func GetShared(ctx context.Context, uid int, token string) (view.RespTroubleshootSession, error) {
	if err := ensureSchema(); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return view.RespTroubleshootSession{}, ErrNotFound
	}
	var row dbmodel.TroubleshootSession
	err := invoker.Db.Where("share_token = ?", token).First(&row).Error
	if err != nil || row.ID == 0 {
		return view.RespTroubleshootSession{}, ErrNotFound
	}
	return authorizedSessionView(ctx, uid, row)
}

func Start(ctx context.Context, uid int, text string) (view.RespTroubleshootSession, error) {
	if err := ensureSchema(); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	text, err := cleanText(uid, text)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	session := &dbmodel.TroubleshootSession{
		UID:    uid,
		Title:  trimRunes(text, 32),
		Status: dbmodel.TroubleshootStatusIdle,
	}
	if err = invoker.Db.Create(session).Error; err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if _, err = addMessage(session.ID, "user", "text", text, ""); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	return finishTurn(ctx, session)
}

func Reply(ctx context.Context, uid int, id int, text string) (view.RespTroubleshootSession, error) {
	if err := ensureSchema(); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	text, err := cleanText(uid, text)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	session, err := ownedSession(uid, id)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if err := checkSessionAccess(ctx, uid, *session); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if session.Status == dbmodel.TroubleshootStatusWaitingConfirm {
		return view.RespTroubleshootSession{}, ErrWaiting
	}
	if _, err = addMessage(session.ID, "user", "text", text, ""); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	return finishTurn(ctx, session)
}

func Confirm(ctx context.Context, uid int, id int, accept bool) (view.RespTroubleshootSession, error) {
	if err := ensureSchema(); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	session, err := ownedSession(uid, id)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if err := checkSessionAccess(ctx, uid, *session); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if session.Status != dbmodel.TroubleshootStatusWaitingConfirm || session.Pending == "" {
		return view.RespTroubleshootSession{}, ErrNoPending
	}
	var pending pendingCall
	if err = json.Unmarshal([]byte(session.Pending), &pending); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if !accept {
		payload := mustPayload(messagePayload{Tool: pending.Name, Summary: "已取消这次查询", Status: "canceled"})
		if err = updateMessage(pending.MessageID, "用户取消了这次查询", payload); err != nil {
			return view.RespTroubleshootSession{}, err
		}
		session.Status = dbmodel.TroubleshootStatusIdle
		session.Pending = ""
		if err = saveSession(session); err != nil {
			return view.RespTroubleshootSession{}, err
		}
		return loadView(session.ID, true)
	}
	outcome := applyTool(ctx, session, pending.Name, pending.Args, true)
	payload := mustPayload(messagePayload{
		Tool:    pending.Name,
		Summary: outcome.Summary,
		Status:  outcome.Status,
		Link:    outcome.Link,
		Result:  outcome.Result,
	})
	if err = updateMessage(pending.MessageID, outcome.Detail, payload); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	session.Status = dbmodel.TroubleshootStatusIdle
	session.Pending = ""
	if err = saveSession(session); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	return finishTurn(ctx, session)
}

func Share(uid int, id int) (string, error) {
	if err := ensureSchema(); err != nil {
		return "", err
	}
	session, err := ownedSession(uid, id)
	if err != nil {
		return "", err
	}
	if err := checkSessionAccess(context.Background(), uid, *session); err != nil {
		return "", err
	}
	if session.ShareToken != "" {
		return session.ShareToken, nil
	}
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	session.ShareToken = token
	if err = saveSession(session); err != nil {
		return "", err
	}
	return token, nil
}

func cleanText(uid int, text string) (string, error) {
	if uid <= 0 {
		return "", errors.New("需要登录")
	}
	text = trimRunes(strings.TrimSpace(text), 4000)
	if text == "" {
		return "", ErrEmpty
	}
	return text, nil
}

func finishTurn(ctx context.Context, session *dbmodel.TroubleshootSession) (view.RespTroubleshootSession, error) {
	if err := runLoop(ctx, session); err != nil {
		_, _ = addMessage(session.ID, "assistant", "final", err.Error(), "")
		session.Status = dbmodel.TroubleshootStatusIdle
		session.Pending = ""
		_ = saveSession(session)
	}
	return loadView(session.ID, true)
}

func runLoop(ctx context.Context, session *dbmodel.TroubleshootSession) error {
	seen := map[string]int{}
	var lastLink *view.TroubleshootLink
	var lastResult *view.TroubleshootResult
	rows, err := listMessages(session.ID)
	if err != nil {
		return err
	}
	// A confirmed query has already run before this loop resumes.
	for i := len(rows) - 1; i >= 0 && rows[i].Role != "user"; i-- {
		var payload messagePayload
		if rows[i].Role == "tool" && json.Unmarshal([]byte(rows[i].Payload), &payload) == nil && payload.Result != nil {
			lastLink, lastResult = payload.Link, payload.Result
			break
		}
	}
	for step := 0; step < maxSteps; step++ {
		if err := ctx.Err(); err != nil {
			return err
		}
		rows, err := listMessages(session.ID)
		if err != nil {
			return err
		}
		raw, err := completeFn(ctx, modelTranscript(rows), ai.CompletionOptions{MaxTokens: 900})
		if err != nil {
			return err
		}
		action := parseAction(raw)
		if action.Action != "tool" {
			text := strings.TrimSpace(action.Text)
			if text == "" {
				text = "没有得出结论。"
			}
			return saveFinal(ctx, session, text, action.Query, lastLink, lastResult)
		}
		key := action.Name + string(action.Args)
		if seen[key] >= 1 {
			return saveFinal(ctx, session, "同一查询重复了，先停下来看已有结果。", nil, lastLink, lastResult)
		}
		seen[key]++
		if _, err = addMessage(session.ID, "assistant", "tool", strings.TrimSpace(raw), ""); err != nil {
			return err
		}
		outcome := applyTool(ctx, session, action.Name, action.Args, false)
		if outcome.Link != nil {
			lastLink = outcome.Link
			lastResult = outcome.Result
		}
		payload := mustPayload(messagePayload{
			Tool:    action.Name,
			Summary: outcome.Summary,
			Status:  outcome.Status,
			Link:    outcome.Link,
			Result:  outcome.Result,
		})
		toolMessage, err := addMessage(session.ID, "tool", "tool", outcome.Detail, payload)
		if err != nil {
			return err
		}
		if outcome.Wait {
			pending, err := json.Marshal(pendingCall{
				MessageID: toolMessage.ID,
				Name:      action.Name,
				Args:      action.Args,
				Summary:   outcome.Summary,
			})
			if err != nil {
				return err
			}
			session.Status = dbmodel.TroubleshootStatusWaitingConfirm
			session.Pending = string(pending)
			return saveSession(session)
		}
		if err = saveSession(session); err != nil {
			return err
		}
	}
	return saveFinal(ctx, session, "已排查 8 步，先停在这里。可以把范围再收窄一点。", nil, lastLink, lastResult)
}

func saveFinal(ctx context.Context, session *dbmodel.TroubleshootSession, text string, query *queryArgs, fallback *view.TroubleshootLink, result *view.TroubleshootResult) error {
	link := fallback
	if fallback == nil && query != nil && query.Tid > 0 {
		built := view.TroubleshootLink{
			Tid:   query.Tid,
			Query: query.Query,
			ST:    unixSeconds(query.ST),
			ET:    unixSeconds(query.ET),
		}
		if detail, err := tables.Describe(ctx, session.UID, query.Tid); err == nil {
			built.Database = detail.Database
			built.Table = detail.Name
			built.InstanceID = detail.InstanceID
		}
		link = &built
	}
	payload := ""
	if link != nil && link.Tid > 0 {
		payload = mustPayload(messagePayload{Link: link, Result: result})
	}
	if _, err := addMessage(session.ID, "assistant", "final", text, payload); err != nil {
		return err
	}
	session.Status = dbmodel.TroubleshootStatusIdle
	session.Pending = ""
	return saveSession(session)
}

func modelTranscript(rows []dbmodel.TroubleshootMessage) []ai.Message {
	out := []ai.Message{{Role: "system", Content: systemPrompt(nowFn())}}
	for _, row := range rows {
		switch row.Role {
		case "assistant":
			out = append(out, ai.Message{Role: "assistant", Content: row.Content})
		case "tool":
			out = append(out, ai.Message{Role: "user", Content: "工具结果：\n" + row.Content})
		default:
			out = append(out, ai.Message{Role: "user", Content: row.Content})
		}
	}
	if len(out) <= 17 {
		return out
	}
	return append([]ai.Message{out[0]}, out[len(out)-16:]...)
}

func applyTool(ctx context.Context, session *dbmodel.TroubleshootSession, name string, raw json.RawMessage, force bool) toolOutcome {
	switch name {
	case toolListTables:
		return listTables(ctx, session.UID)
	case toolDescribeTable:
		return describeTable(ctx, session.UID, raw)
	case toolRunQuery:
		return runQuery(ctx, session, raw, force)
	default:
		return toolOutcome{Summary: "无法识别这个步骤", Detail: "未知工具 " + name, Status: "error"}
	}
}

func listTables(ctx context.Context, uid int) toolOutcome {
	items, err := tables.List(ctx, uid)
	if err != nil {
		return toolOutcome{Summary: "读取日志表失败", Detail: err.Error(), Status: "error"}
	}
	listed := make([]map[string]any, 0, len(items))
	for _, item := range items {
		listed = append(listed, map[string]any{
			"tid":        item.ID,
			"instanceId": item.InstanceID,
			"database":   item.Database,
			"table":      item.Name,
			"desc":       item.Desc,
			"timeField":  item.TimeField,
		})
	}
	raw, err := json.Marshal(listed)
	if err != nil {
		return toolOutcome{Summary: "读取日志表失败", Detail: err.Error(), Status: "error"}
	}
	summary := fmt.Sprintf("找到 %d 张日志表", len(items))
	if len(items) == 0 {
		summary = "没有可查询的日志表"
	}
	return toolOutcome{Summary: summary, Detail: string(raw), Status: "done"}
}

func describeTable(ctx context.Context, uid int, raw json.RawMessage) toolOutcome {
	var args struct {
		Tid int `json:"tid"`
	}
	if err := json.Unmarshal(raw, &args); err != nil || args.Tid <= 0 {
		return toolOutcome{Summary: "无法查看字段", Detail: "describe_table 需要 tid", Status: "error"}
	}
	detail, err := tables.Describe(ctx, uid, args.Tid)
	if err != nil {
		return toolOutcome{Summary: "无法查看字段", Detail: err.Error(), Status: "error"}
	}
	columns := make([]map[string]string, 0, len(detail.Columns))
	for _, column := range detail.Columns {
		columns = append(columns, map[string]string{"field": column.Field, "type": column.Type})
	}
	body, err := json.Marshal(map[string]any{
		"tid":        detail.ID,
		"instanceId": detail.InstanceID,
		"database":   detail.Database,
		"table":      detail.Name,
		"timeField":  detail.TimeField,
		"columns":    columns,
	})
	if err != nil {
		return toolOutcome{Summary: "无法查看字段", Detail: err.Error(), Status: "error"}
	}
	return toolOutcome{
		Summary: "查看 " + tableLabel(detail, args.Tid) + " 的字段",
		Detail:  string(body),
		Status:  "done",
	}
}

func runQuery(ctx context.Context, session *dbmodel.TroubleshootSession, raw json.RawMessage, force bool) toolOutcome {
	var args queryArgs
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &args); err != nil {
			return toolOutcome{Summary: "无法执行查询", Detail: "run_query 参数无法解析", Status: "error"}
		}
	}
	args, err := normalizeQueryArgs(args, nowFn())
	if err != nil {
		return toolOutcome{Summary: "无法执行查询", Detail: err.Error(), Status: "error"}
	}
	detail, err := tables.Describe(ctx, session.UID, args.Tid)
	if err != nil {
		return toolOutcome{Summary: "无法执行查询", Detail: err.Error(), Status: "error"}
	}
	window := args.ET - args.ST
	label := tableLabel(detail, args.Tid)
	summary := fmt.Sprintf("查询 %s，时间范围 %s", label, formatWindow(window))
	if wait, reason := needsConfirm(session.LastTid, session.LastWindow, args.Tid, window); wait && !force {
		return toolOutcome{Summary: summary + "（" + reason + "）", Detail: "等待用户确认：" + summary, Status: "waiting", Wait: true}
	}
	hit, err := queries.Run(ctx, session.UID, view.QueryRequestV2{
		Tid:      args.Tid,
		ST:       args.ST,
		ET:       args.ET,
		Page:     1,
		PageSize: args.PageSize,
		Query:    args.Query,
	})
	if err != nil {
		return toolOutcome{Summary: summary + " 失败", Detail: err.Error(), Status: "error"}
	}
	session.LastTid = args.Tid
	if window > session.LastWindow {
		session.LastWindow = window
	}
	link := hit.Link
	if link.Tid == 0 {
		link = view.TroubleshootLink{
			Tid:        args.Tid,
			InstanceID: detail.InstanceID,
			Database:   detail.Database,
			Table:      detail.Name,
			Query:      args.Query,
			ST:         args.ST,
			ET:         args.ET,
		}
	}
	detailText := fmt.Sprintf("count: %d\nsql: %s\n%s", hit.Count, trimRunes(hit.SQL, 500), hit.Preview)
	return toolOutcome{
		Summary: fmt.Sprintf("%s，%d 条", summary, hit.Count),
		Detail:  detailText,
		Status:  "done",
		Link:    &link,
		Result:  &view.TroubleshootResult{Count: hit.Count, Preview: hit.Preview},
	}
}
