package troubleshoot

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const (
	maxSteps             = 8
	maxPageSize          = 30
	confirmWindowSeconds = int64(6 * time.Hour / time.Second)
	defaultWindowSeconds = int64(15 * time.Minute / time.Second)
	toolListTables       = "list_tables"
	toolDescribeTable    = "describe_table"
	toolRunQuery         = "run_query"
)

type tableBrief struct {
	ID         int
	Name       string
	Database   string
	InstanceID int
	TimeField  string
	Desc       string
}

type tableDetail struct {
	tableBrief
	Columns []view.Column
}

type queryHit struct {
	Count   uint64
	SQL     string
	Preview string
	Link    view.TroubleshootLink
}

type catalog interface {
	List(ctx context.Context, uid int) ([]tableBrief, error)
	Describe(ctx context.Context, uid int, tid int) (tableDetail, error)
	CheckAccess(ctx context.Context, uid int, tid int) error
}

type queryRunner interface {
	Run(ctx context.Context, uid int, req view.QueryRequestV2) (queryHit, error)
}

type queryArgs struct {
	Tid      int    `json:"tid"`
	ST       int64  `json:"st"`
	ET       int64  `json:"et"`
	Query    string `json:"query"`
	PageSize uint32 `json:"pageSize"`
}

type modelAction struct {
	Action string          `json:"action"`
	Name   string          `json:"name"`
	Args   json.RawMessage `json:"args"`
	Text   string          `json:"text"`
	Query  *queryArgs      `json:"query"`
}

type toolOutcome struct {
	Summary string
	Detail  string
	Status  string
	Link    *view.TroubleshootLink
	Result  *view.TroubleshootResult
	Wait    bool
}

func needsConfirm(lastTid int, lastWindow int64, tid int, window int64) (bool, string) {
	reasons := make([]string, 0, 2)
	if lastTid > 0 && tid != lastTid {
		reasons = append(reasons, "将切换日志表")
	}
	if window > confirmWindowSeconds && window > lastWindow {
		reasons = append(reasons, "时间范围超过 6 小时")
	}
	if len(reasons) == 0 {
		return false, ""
	}
	return true, strings.Join(reasons, "，")
}

func normalizeQueryArgs(args queryArgs, now time.Time) (queryArgs, error) {
	if args.Tid <= 0 {
		return args, fmt.Errorf("缺少 tid")
	}
	args.ST = unixSeconds(args.ST)
	args.ET = unixSeconds(args.ET)
	if args.ET == 0 {
		args.ET = now.Unix()
	}
	if args.ST == 0 {
		args.ST = args.ET - defaultWindowSeconds
	}
	if args.ST >= args.ET {
		return args, fmt.Errorf("时间范围无效")
	}
	if args.PageSize == 0 {
		args.PageSize = 20
	}
	args.PageSize = min(args.PageSize, maxPageSize)
	args.Query = trimRunes(strings.TrimSpace(args.Query), 4000)
	return args, nil
}

func unixSeconds(value int64) int64 {
	if value > 1_000_000_000_000 {
		return value / 1000
	}
	return value
}

func formatWindow(seconds int64) string {
	if seconds <= 0 {
		return "未指定时间"
	}
	if seconds >= 3600 && seconds%3600 == 0 {
		return fmt.Sprintf("%d 小时", seconds/3600)
	}
	if seconds >= 60 && seconds%60 == 0 {
		return fmt.Sprintf("%d 分钟", seconds/60)
	}
	return fmt.Sprintf("%d 秒", seconds)
}

func tableLabel(detail tableDetail, tid int) string {
	if detail.Database != "" && detail.Name != "" {
		return detail.Database + "." + detail.Name
	}
	return fmt.Sprintf("日志表 #%d", tid)
}

func parseAction(raw string) modelAction {
	body := extractJSON(raw)
	var action modelAction
	if body != "" && json.Unmarshal([]byte(body), &action) == nil && (action.Action == "tool" || action.Action == "final") {
		if action.Action == "final" && strings.TrimSpace(action.Text) == "" {
			action.Text = strings.TrimSpace(raw)
		}
		return action
	}
	return modelAction{Action: "final", Text: strings.TrimSpace(raw)}
}

func extractJSON(raw string) string {
	text := strings.TrimSpace(raw)
	if inner, ok := strings.CutPrefix(text, "```"); ok {
		text = strings.TrimSpace(inner)
		text, _ = strings.CutPrefix(text, "json")
		text = strings.TrimSpace(text)
		text, _ = strings.CutSuffix(text, "```")
		text = strings.TrimSpace(text)
	}
	start := strings.IndexByte(text, '{')
	end := strings.LastIndexByte(text, '}')
	if start < 0 || end <= start {
		return ""
	}
	return text[start : end+1]
}

func trimRunes(value string, limit int) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return strings.TrimSpace(string(runes[:limit]))
}
