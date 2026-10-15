package troubleshoot

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

var (
	ErrNotFound  = errors.New("对话不存在")
	ErrWaiting   = errors.New("请先确认或取消当前查询")
	ErrEmpty     = errors.New("请先描述现象")
	ErrNoPending = errors.New("当前没有待确认的查询")
)

type messagePayload struct {
	Tool    string                   `json:"tool,omitempty"`
	Summary string                   `json:"summary,omitempty"`
	Status  string                   `json:"status,omitempty"`
	Link    *view.TroubleshootLink   `json:"link,omitempty"`
	Result  *view.TroubleshootResult `json:"result,omitempty"`
}

type pendingCall struct {
	MessageID int             `json:"messageId"`
	Name      string          `json:"name"`
	Args      json.RawMessage `json:"args"`
	Summary   string          `json:"summary"`
}

func ownedSession(uid int, id int) (*dbmodel.TroubleshootSession, error) {
	var row dbmodel.TroubleshootSession
	err := invoker.Db.First(&row, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || row.ID == 0 {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if row.UID != uid {
		return nil, ErrNotFound
	}
	return &row, nil
}

func addMessage(sessionID int, role string, kind string, content string, payload string) (dbmodel.TroubleshootMessage, error) {
	row := dbmodel.TroubleshootMessage{
		SessionID: sessionID,
		Role:      role,
		Kind:      kind,
		Content:   content,
		Payload:   payload,
	}
	if err := invoker.Db.Create(&row).Error; err != nil {
		return dbmodel.TroubleshootMessage{}, err
	}
	return row, nil
}

func updateMessage(id int, content string, payload string) error {
	return invoker.Db.Model(&dbmodel.TroubleshootMessage{}).Where("id = ?", id).Updates(map[string]any{
		"content": content,
		"payload": payload,
	}).Error
}

func listMessages(sessionID int) ([]dbmodel.TroubleshootMessage, error) {
	var rows []dbmodel.TroubleshootMessage
	err := invoker.Db.Where("session_id = ?", sessionID).Order("id asc").Find(&rows).Error
	return rows, err
}

func saveSession(row *dbmodel.TroubleshootSession) error {
	return invoker.Db.Save(row).Error
}

func randomToken() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func loadView(id int, withMessages bool) (view.RespTroubleshootSession, error) {
	var row dbmodel.TroubleshootSession
	err := invoker.Db.First(&row, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || row.ID == 0 {
		return view.RespTroubleshootSession{}, ErrNotFound
	}
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	return sessionView(row, withMessages)
}

func sessionView(row dbmodel.TroubleshootSession, withMessages bool) (view.RespTroubleshootSession, error) {
	resp := view.RespTroubleshootSession{
		ID:         row.ID,
		Title:      row.Title,
		Status:     row.Status,
		ShareToken: row.ShareToken,
		UpdatedAt:  row.Utime,
		Pending:    pendingView(row.Pending),
	}
	if !withMessages {
		return resp, nil
	}
	rows, err := listMessages(row.ID)
	if err != nil {
		return view.RespTroubleshootSession{}, err
	}
	resp.Messages = messageViews(rows)
	return resp, nil
}

func messageViews(rows []dbmodel.TroubleshootMessage) []view.RespTroubleshootMessage {
	items := make([]view.RespTroubleshootMessage, 0, len(rows))
	for _, item := range rows {
		if item.Role == "assistant" && item.Kind == "tool" {
			continue
		}
		items = append(items, messageView(item))
	}
	return items
}

func pendingView(raw string) *view.RespTroubleshootPending {
	if raw == "" {
		return nil
	}
	var pending pendingCall
	if json.Unmarshal([]byte(raw), &pending) != nil || pending.Summary == "" {
		return nil
	}
	return &view.RespTroubleshootPending{Tool: pending.Name, Summary: pending.Summary}
}

func messageView(row dbmodel.TroubleshootMessage) view.RespTroubleshootMessage {
	var payload messagePayload
	if row.Payload != "" {
		_ = json.Unmarshal([]byte(row.Payload), &payload)
	}
	item := view.RespTroubleshootMessage{
		ID:        row.ID,
		Role:      row.Role,
		Kind:      row.Kind,
		Tool:      payload.Tool,
		Summary:   payload.Summary,
		Status:    payload.Status,
		Link:      payload.Link,
		Result:    payload.Result,
		CreatedAt: row.Ctime,
	}
	if row.Role == "tool" {
		item.Detail = row.Content
		return item
	}
	item.Text = row.Content
	return item
}

func encodePayload(payload messagePayload) string {
	raw, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	return string(raw)
}

func mustPayload(payload messagePayload) string {
	encoded := encodePayload(payload)
	if encoded == "" {
		return fmt.Sprintf(`{"summary":%q}`, payload.Summary)
	}
	return encoded
}
