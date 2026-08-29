package query

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/internal/service/querycompile"
)

type RunResponse struct {
	Count uint64                   `json:"count"`
	Cost  int64                    `json:"cost"`
	Keys  []view.QueryLogsField    `json:"keys"`
	Logs  []map[string]interface{} `json:"logs"`
	Query string                   `json:"query"`
	SQL   string                   `json:"sql"`
	Plan  view.QueryPlan           `json:"plan"`
}

type queryRunResult struct {
	Count uint64
	Logs  []map[string]interface{}
	SQL   string
	Plan  view.QueryPlan
}

type fieldStatsRunResult struct {
	Total uint64
	Items []FieldStatsItem
	SQL   string
	Plan  view.QueryPlan
}

type FieldStatsItem struct {
	Value      string  `json:"value"`
	Count      uint64  `json:"count"`
	Percentage float64 `json:"percentage"`
}

type FieldStatsResponse struct {
	Total uint64           `json:"total"`
	Items []FieldStatsItem `json:"items"`
	SQL   string           `json:"sql"`
	Plan  view.QueryPlan   `json:"plan"`
}

type sqlExecutor interface {
	DoSQL(string) (view.RespComplete, error)
}

type contextSQLExecutor interface {
	DoSQLContext(context.Context, string) (view.RespComplete, error)
}

func isRequestCanceled(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

// Run godoc
// @Summary      执行结构化日志查询
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/run [post]
func Run(c *core.Context) {
	startedAt := time.Now()
	var req view.QueryRequestV2
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ctx, tableInfo, err := buildRunContext(req.Tid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "clickhouse i/o timeout", err)
		return
	}
	result, err := runStructuredQueryWithFallback(c.Request.Context(), op, req, ctx)
	if err != nil {
		if isRequestCanceled(err) {
			return
		}
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(RunResponse{
		Count: result.Count,
		Cost:  time.Since(startedAt).Milliseconds(),
		Keys:  buildQueryLogFields(result.Logs),
		Logs:  result.Logs,
		Query: result.SQL,
		SQL:   result.SQL,
		Plan:  result.Plan,
	})
}

func runStructuredQueryWithFallback(reqCtx context.Context, op sqlExecutor, req view.QueryRequestV2, ctx querycompile.CompileContext) (queryRunResult, error) {
	result, err := runStructuredQueryOnce(reqCtx, op, req, ctx)
	if err != nil {
		return queryRunResult{}, err
	}
	if result.Count > 0 || len(result.Logs) > 0 {
		return result, nil
	}
	fallbackReq, ok := rawLogFallbackRequest(req)
	if !ok {
		return result, nil
	}
	fallbackResult, err := runStructuredQueryOnce(reqCtx, op, fallbackReq, ctx)
	if err != nil {
		elog.Warn("query v2 raw log fallback failed", elog.FieldErr(err), elog.String("sql", result.SQL))
		return result, nil
	}
	if fallbackResult.Count > 0 || len(fallbackResult.Logs) > 0 {
		return fallbackResult, nil
	}
	return result, nil
}

func runStructuredQueryOnce(reqCtx context.Context, op sqlExecutor, req view.QueryRequestV2, ctx querycompile.CompileContext) (queryRunResult, error) {
	sql, plan, err := querycompile.Compile(req, ctx)
	if err != nil {
		return queryRunResult{}, err
	}
	countSQL, _, err := querycompile.CompileCount(req, ctx)
	if err != nil {
		return queryRunResult{}, err
	}
	logs, err := runSQL(reqCtx, op, sql)
	if err != nil {
		if !isRequestCanceled(err) {
			elog.Error("query v2 run logs failed", elog.FieldErr(err), elog.String("sql", sql))
		}
		return queryRunResult{}, err
	}
	count := uint64(len(logs.Logs))
	if countResp, countErr := runSQL(reqCtx, op, countSQL); countErr == nil {
		count = extractCount(countResp.Logs, count)
	} else {
		if isRequestCanceled(countErr) {
			return queryRunResult{}, countErr
		}
		elog.Warn("query v2 run count failed", elog.FieldErr(countErr), elog.String("sql", countSQL))
	}
	return queryRunResult{
		Count: count,
		Logs:  logs.Logs,
		SQL:   sql,
		Plan:  plan,
	}, nil
}

func rawLogFallbackRequest(req view.QueryRequestV2) (view.QueryRequestV2, bool) {
	next := req
	next.Conditions = append([]view.QueryConditionV2(nil), req.Conditions...)
	changed := false
	for idx, cond := range next.Conditions {
		if !canFallbackQueryFieldToRawLog(cond.Field) {
			continue
		}
		switch cond.Operator {
		case view.QueryOperatorEQ, view.QueryOperatorNEQ, view.QueryOperatorContains, view.QueryOperatorNotContains, view.QueryOperatorIn:
		default:
			continue
		}
		cond.Field = rawLogFallbackFieldRef(cond.Field)
		next.Conditions[idx] = cond
		changed = true
	}
	return next, changed
}

func canFallbackQueryFieldToRawLog(field view.QueryFieldRef) bool {
	if field.Source != view.QueryFieldSourceColumn {
		return false
	}
	key := rawLogFallbackFieldKey(field)
	if key == "" {
		return false
	}
	if strings.EqualFold(key, "_raw_log_") || strings.EqualFold(key, "_raw_log") {
		return false
	}
	return !isQuerySystemTimeField(key)
}

func rawLogFallbackFieldRef(field view.QueryFieldRef) view.QueryFieldRef {
	field.Source = view.QueryFieldSourceJSONPath
	field.Path = rawLogFallbackFieldKey(field)
	field.IsAccelerated = false
	field.AcceleratedCol = ""
	return field
}

func rawLogFallbackFieldKey(field view.QueryFieldRef) string {
	key := strings.TrimSpace(field.Path)
	if key == "" {
		key = strings.TrimSpace(field.FieldKey)
	}
	return key
}

func isQuerySystemTimeField(field string) bool {
	field = strings.ToLower(strings.TrimSpace(field))
	return field == "time" || field == "timestamp" || strings.HasPrefix(field, "_time")
}

// FieldStats godoc
// @Summary      执行字段值分布统计
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/field-stats [post]
func FieldStats(c *core.Context) {
	var req view.QueryFieldStatsRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ctx, tableInfo, err := buildRunContext(req.Tid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if err = permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(tableInfo.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(tableInfo.ID),
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "clickhouse i/o timeout", err)
		return
	}
	result, err := runFieldStatsWithFallback(c.Request.Context(), op, req, ctx)
	if err != nil {
		if isRequestCanceled(err) {
			return
		}
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	c.JSONOK(FieldStatsResponse{
		Total: result.Total,
		Items: result.Items,
		SQL:   result.SQL,
		Plan:  result.Plan,
	})
}

func runFieldStatsWithFallback(reqCtx context.Context, op sqlExecutor, req view.QueryFieldStatsRequest, ctx querycompile.CompileContext) (fieldStatsRunResult, error) {
	result, err := runFieldStatsOnce(reqCtx, op, req, ctx)
	if err != nil {
		return fieldStatsRunResult{}, err
	}
	if result.Total > 0 || len(result.Items) > 0 {
		return result, nil
	}
	fallbackReq, ok := rawLogFieldStatsFallbackRequest(req)
	if !ok {
		return result, nil
	}
	fallbackResult, err := runFieldStatsOnce(reqCtx, op, fallbackReq, ctx)
	if err != nil {
		elog.Warn("query v2 field stats raw log fallback failed", elog.FieldErr(err), elog.String("sql", result.SQL))
		return result, nil
	}
	if fallbackResult.Total > 0 || len(fallbackResult.Items) > 0 {
		return fallbackResult, nil
	}
	return result, nil
}

func runFieldStatsOnce(reqCtx context.Context, op sqlExecutor, req view.QueryFieldStatsRequest, ctx querycompile.CompileContext) (fieldStatsRunResult, error) {
	statsSQL, totalSQL, plan, err := querycompile.CompileFieldStats(req, ctx)
	if err != nil {
		return fieldStatsRunResult{}, err
	}
	totalResp, err := runSQL(reqCtx, op, totalSQL)
	if err != nil {
		if !isRequestCanceled(err) {
			elog.Error("query v2 field stats total failed", elog.FieldErr(err), elog.String("sql", totalSQL))
		}
		return fieldStatsRunResult{}, err
	}
	total := extractCount(totalResp.Logs, 0)
	statsResp, err := runSQL(reqCtx, op, statsSQL)
	if err != nil {
		if !isRequestCanceled(err) {
			elog.Error("query v2 field stats failed", elog.FieldErr(err), elog.String("sql", statsSQL))
		}
		return fieldStatsRunResult{}, err
	}
	items := make([]FieldStatsItem, 0, len(statsResp.Logs))
	for _, row := range statsResp.Logs {
		count := extractCount([]map[string]interface{}{row}, 0)
		percentage := float64(0)
		if total > 0 {
			percentage = float64(count) / float64(total) * 100
		}
		items = append(items, FieldStatsItem{
			Value:      fmt.Sprint(row["field_value"]),
			Count:      count,
			Percentage: percentage,
		})
	}
	return fieldStatsRunResult{
		Total: total,
		Items: items,
		SQL:   statsSQL,
		Plan:  plan,
	}, nil
}

func runSQL(reqCtx context.Context, op sqlExecutor, sql string) (view.RespComplete, error) {
	if err := reqCtx.Err(); err != nil {
		return view.RespComplete{}, err
	}
	if contextOp, ok := op.(contextSQLExecutor); ok {
		return contextOp.DoSQLContext(reqCtx, sql)
	}
	resp, err := op.DoSQL(sql)
	if err != nil {
		return resp, err
	}
	if err := reqCtx.Err(); err != nil {
		return view.RespComplete{}, err
	}
	return resp, nil
}

func rawLogFieldStatsFallbackRequest(req view.QueryFieldStatsRequest) (view.QueryFieldStatsRequest, bool) {
	next := req
	changed := false
	if canFallbackQueryFieldToRawLog(next.Field) {
		next.Field = rawLogFallbackFieldRef(next.Field)
		changed = true
	}
	if fallbackQuery, ok := rawLogFallbackRequest(next.QueryRequestV2); ok {
		next.QueryRequestV2 = fallbackQuery
		changed = true
	}
	return next, changed
}

func buildRunContext(tid int) (querycompile.CompileContext, dbmodel.BaseTable, error) {
	if tid == 0 || invoker.Db == nil {
		return querycompile.CompileContext{}, dbmodel.BaseTable{}, fmt.Errorf("table id is required")
	}
	tableInfo, err := dbmodel.TableInfo(invoker.Db, tid)
	if err != nil {
		return querycompile.CompileContext{}, dbmodel.BaseTable{}, err
	}
	if tableInfo.Name == "" || tableInfo.Database == nil {
		return querycompile.CompileContext{}, dbmodel.BaseTable{}, fmt.Errorf("table %d not found", tid)
	}
	rawLogFieldExists, defaultRawLogExists := rawLogColumnAvailability(tableInfo)
	rawLogColumn, rawLogUnavailable := rawLogColumnForTable(
		tableInfo.CreateType,
		tableInfo.RawLogField,
		rawLogFieldExists,
		defaultRawLogExists,
	)
	return querycompile.CompileContext{
		TableName:                fmt.Sprintf("`%s`.`%s`", tableInfo.Database.Name, tableInfo.Name),
		TimeField:                tableInfo.GetTimeField(),
		TimeFieldType:            tableInfo.TimeFieldType,
		RawJSONColumn:            rawLogColumn,
		RawJSONColumnUnavailable: rawLogUnavailable,
	}, tableInfo, nil
}

func extractCount(rows []map[string]interface{}, fallback uint64) uint64 {
	if len(rows) == 0 {
		return fallback
	}
	for _, key := range []string{"count", "count()", "COUNT()"} {
		if value, ok := rows[0][key]; ok {
			switch typed := value.(type) {
			case uint64:
				return typed
			case uint:
				return uint64(typed)
			case uint32:
				return uint64(typed)
			case int:
				if typed >= 0 {
					return uint64(typed)
				}
			case int64:
				if typed >= 0 {
					return uint64(typed)
				}
			case float64:
				if typed >= 0 {
					return uint64(typed)
				}
			case string:
				if parsed, err := strconv.ParseUint(typed, 10, 64); err == nil {
					return parsed
				}
			}
		}
	}
	return fallback
}

func buildQueryLogFields(rows []map[string]interface{}) []view.QueryLogsField {
	if len(rows) == 0 {
		return []view.QueryLogsField{}
	}
	fields := make([]view.QueryLogsField, 0, len(rows[0]))
	for key := range rows[0] {
		fields = append(fields, view.QueryLogsField{Field: key, Alias: key})
	}
	return fields
}
