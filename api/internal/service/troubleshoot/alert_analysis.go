package troubleshoot

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/querycompile"
)

type AlertSeed struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Tid         int    `json:"tid"`
	Query       string `json:"query"`
	Start       int64  `json:"start"`
	End         int64  `json:"end"`
}

type AlertAnalysisResult struct{ Summary, Snapshot string }
type alertBoundsKey struct{}
type alertBounds struct {
	Start, End   int64
	EvidenceNote string
}
type alertSnapshot struct {
	Version  int                           `json:"version"`
	Session  dbmodel.TroubleshootSession   `json:"session"`
	Messages []dbmodel.TroubleshootMessage `json:"messages"`
}

func AnalyzeAlert(ctx context.Context, uid int, seed AlertSeed) (AlertAnalysisResult, error) {
	var result AlertAnalysisResult
	if err := ensureSchema(); err != nil {
		return result, err
	}
	if uid <= 0 || tables.CheckAccess(ctx, uid, seed.Tid) != nil {
		return result, ErrPermission
	}
	seed.Start, seed.End = unixSeconds(seed.Start), unixSeconds(seed.End)
	if seed.Start <= 0 || seed.End <= seed.Start || seed.End-seed.Start > 3600 {
		return result, fmt.Errorf("告警分析时间窗口无效或超过一小时")
	}
	query := seed.Query
	if strings.ReplaceAll(strings.TrimSpace(query), " ", "") == "1=1" {
		query = ""
	}
	note := ""
	_, _, compileErr := querycompile.Compile(view.QueryRequestV2{Tid: seed.Tid, ST: seed.Start, ET: seed.End, Query: query}, querycompile.CompileContext{TableName: "logs"})
	if compileErr != nil {
		query = ""
		note = "证据范围：原告警表达式不支持安全转换，本次使用该表的时间窗口样本；样本数量不代表原告警匹配数量，也未复算聚合指标。"
	}
	ctx = context.WithValue(ctx, alertBoundsKey{}, alertBounds{Start: seed.Start, End: seed.End, EvidenceNote: note})
	session := dbmodel.TroubleshootSession{UID: uid, Source: "alarm-analysis", Title: trimRunes(seed.Title, 32), Status: dbmodel.TroubleshootStatusIdle}
	if err := invoker.Db.WithContext(ctx).Create(&session).Error; err != nil {
		return result, err
	}
	body, err := json.Marshal(seed)
	if err != nil {
		return result, err
	}
	if _, err = addMessage(session.ID, "user", "text", "请分析此次告警，以下 JSON 为告警事实：\n"+string(body), ""); err != nil {
		return result, err
	}
	args, _ := json.Marshal(queryArgs{Tid: seed.Tid, ST: seed.Start, ET: seed.End, Query: query, PageSize: 30})
	action, _ := json.Marshal(modelAction{Action: "tool", Name: toolRunQuery, Args: args})
	if _, err = addMessage(session.ID, "assistant", "tool", string(action), ""); err != nil {
		return result, err
	}
	outcome := runQuery(ctx, &session, args, true)
	if outcome.Status != "done" {
		return result, fmt.Errorf("告警证据查询失败: %s", outcome.Detail)
	}
	if note != "" {
		outcome.Detail = note + "\n\n" + outcome.Detail
	}
	if _, err = addMessage(session.ID, "tool", "tool", outcome.Detail, mustPayload(messagePayload{Tool: toolRunQuery, Summary: outcome.Summary, Status: outcome.Status, Link: outcome.Link, Result: outcome.Result})); err != nil {
		return result, err
	}
	if err = runLoop(ctx, &session); err != nil {
		return result, err
	}
	rows, err := listMessages(session.ID)
	if err != nil {
		return result, err
	}
	if err = checkMessagesAccess(ctx, uid, session, rows); err != nil {
		return result, err
	}
	for i := len(rows) - 1; i >= 0; i-- {
		if rows[i].Role == "assistant" && rows[i].Kind == "final" {
			result.Summary = rows[i].Content
			break
		}
	}
	if strings.TrimSpace(result.Summary) == "" {
		return AlertAnalysisResult{}, fmt.Errorf("告警分析没有结论")
	}
	snapshot, err := json.Marshal(alertSnapshot{Version: 1, Session: session, Messages: rows})
	if err != nil {
		return AlertAnalysisResult{}, err
	}
	result.Snapshot = string(snapshot)
	for _, row := range rows {
		var payload messagePayload
		if json.Unmarshal([]byte(row.Payload), &payload) != nil || payload.Result == nil {
			continue
		}
		for _, sample := range strings.Split(payload.Result.Preview, "\n") {
			if len(strings.TrimSpace(sample)) >= 12 {
				result.Summary = strings.ReplaceAll(result.Summary, strings.TrimSpace(sample), "[日志样本见 Ask]")
			}
		}
	}
	return result, nil
}

var alertRequestID = regexp.MustCompile(`^[A-Za-z0-9_-]{16,64}$`)
var alertTokenID = regexp.MustCompile(`^[A-Za-z0-9_-]{32,64}$`)

func checkedAlertSnapshot(ctx context.Context, uid int, raw string) (alertSnapshot, error) {
	var snapshot alertSnapshot
	if json.Unmarshal([]byte(raw), &snapshot) != nil || snapshot.Version != 1 || len(snapshot.Messages) == 0 {
		return snapshot, ErrNotFound
	}
	return snapshot, checkMessagesAccess(ctx, uid, snapshot.Session, snapshot.Messages)
}

// CheckAlertAnalysisAccess revalidates a saved snapshot before channel delivery.
func CheckAlertAnalysisAccess(ctx context.Context, uid int, raw string) error {
	_, err := checkedAlertSnapshot(ctx, uid, raw)
	return err
}

func StartFromAlert(ctx context.Context, uid int, token, requestID string) (view.RespTroubleshootSession, error) {
	var empty view.RespTroubleshootSession
	if uid <= 0 {
		return empty, ErrPermission
	}
	if !alertRequestID.MatchString(requestID) || !alertTokenID.MatchString(token) {
		return empty, fmt.Errorf("告警链接或请求标识无效")
	}
	if err := ensureSchema(); err != nil {
		return empty, err
	}
	var analysis dbmodel.AlarmAIAnalysis
	if err := invoker.Db.WithContext(ctx).Where("token = ?", token).First(&analysis).Error; err != nil {
		return empty, ErrNotFound
	}
	snapshot, err := checkedAlertSnapshot(ctx, uid, analysis.Snapshot)
	if err != nil {
		return empty, err
	}
	var sessionID int
	err = invoker.Db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		fork := dbmodel.AlarmAIFork{UID: uid, RequestID: requestID, AnalysisID: analysis.ID}
		created := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&fork)
		if created.Error != nil {
			return created.Error
		}
		if created.RowsAffected == 0 {
			if err := tx.Where("uid = ? AND request_id = ?", uid, requestID).First(&fork).Error; err != nil {
				return err
			}
			if fork.AnalysisID != analysis.ID || fork.SessionID <= 0 {
				return fmt.Errorf("请求标识已被使用")
			}
			sessionID = fork.SessionID
			return nil
		}
		session := dbmodel.TroubleshootSession{UID: uid, Title: snapshot.Session.Title, Status: dbmodel.TroubleshootStatusIdle, LastTid: snapshot.Session.LastTid, LastWindow: snapshot.Session.LastWindow}
		if err := tx.Create(&session).Error; err != nil {
			return err
		}
		for _, row := range snapshot.Messages {
			copy := dbmodel.TroubleshootMessage{SessionID: session.ID, Role: row.Role, Kind: row.Kind, Content: row.Content, Payload: row.Payload}
			if err := tx.Create(&copy).Error; err != nil {
				return err
			}
		}
		sessionID = session.ID
		return tx.Model(&fork).Update("session_id", session.ID).Error
	})
	if err != nil {
		return empty, err
	}
	session, err := ownedSession(uid, sessionID)
	if err != nil {
		return empty, err
	}
	return authorizedSessionView(ctx, uid, *session)
}
