package troubleshoot

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var ErrPermission = errors.New("没有此对话所涉日志表的查询权限")

// Recheck every referenced table before returning stored evidence or reusing it
// as model context. Catalog results and field descriptions also contain data.
func checkSessionAccess(ctx context.Context, uid int, session dbmodel.TroubleshootSession) error {
	if uid <= 0 {
		return ErrPermission
	}
	rows, err := listMessages(session.ID)
	if err != nil {
		return err
	}
	return checkMessagesAccess(ctx, uid, session, rows)
}

func authorizedSessionView(ctx context.Context, uid int, session dbmodel.TroubleshootSession) (view.RespTroubleshootSession, error) {
	rows, err := listMessages(session.ID)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	if err := checkMessagesAccess(ctx, uid, session, rows); err != nil {
		return view.RespTroubleshootSession{}, err
	}
	resp, err := sessionView(session, false)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	// Return the checked snapshot rather than loading possibly newer evidence.
	resp.Messages = messageViews(rows)
	return resp, nil
}

func checkMessagesAccess(ctx context.Context, uid int, session dbmodel.TroubleshootSession, rows []dbmodel.TroubleshootMessage) error {
	if uid <= 0 {
		return ErrPermission
	}
	tids := map[int]struct{}{}
	add := func(tid int) {
		if tid > 0 {
			tids[tid] = struct{}{}
		}
	}
	add(session.LastTid)
	requestedTableID := 0
	for _, row := range rows {
		var payload messagePayload
		if row.Payload != "" && json.Unmarshal([]byte(row.Payload), &payload) != nil {
			return ErrPermission
		}
		if payload.Link != nil {
			add(payload.Link.Tid)
		}
		if row.Role == "assistant" && row.Kind == "tool" {
			requestedTableID = 0
			action := parseAction(row.Content)
			if action.Name == toolRunQuery {
				var args queryArgs
				if json.Unmarshal(action.Args, &args) == nil {
					requestedTableID = args.Tid
				}
			}
		}
		// A denied query reveals no table data and must not block later turns.
		if row.Role == "tool" && payload.Tool == toolRunQuery &&
			(payload.Status == "done" || payload.Status == "waiting" || strings.HasPrefix(payload.Summary, "查询 ")) {
			add(requestedTableID)
		}
		if row.Role != "tool" || payload.Status != "done" {
			continue
		}
		switch payload.Tool {
		case toolListTables:
			var items []struct{ Tid int }
			if json.Unmarshal([]byte(row.Content), &items) != nil {
				return ErrPermission
			}
			for _, item := range items {
				add(item.Tid)
			}
		case toolDescribeTable:
			var item struct{ Tid int }
			if json.Unmarshal([]byte(row.Content), &item) != nil {
				return ErrPermission
			}
			add(item.Tid)
		}
	}
	for tid := range tids {
		if err := tables.CheckAccess(ctx, uid, tid); err != nil {
			return ErrPermission
		}
	}
	return nil
}
