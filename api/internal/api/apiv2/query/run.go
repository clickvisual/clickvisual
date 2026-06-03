package query

import (
	"fmt"
	"strconv"
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
	sql, plan, err := querycompile.Compile(req, ctx)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	countSQL, _, err := querycompile.CompileCount(req, ctx)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		c.JSONE(core.CodeErr, "clickhouse i/o timeout", err)
		return
	}
	logs, err := op.DoSQL(sql)
	if err != nil {
		elog.Error("query v2 run logs failed", elog.FieldErr(err), elog.String("sql", sql))
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	count := uint64(len(logs.Logs))
	if countResp, countErr := op.DoSQL(countSQL); countErr == nil {
		count = extractCount(countResp.Logs, count)
	} else {
		elog.Warn("query v2 run count failed", elog.FieldErr(countErr), elog.String("sql", countSQL))
	}
	c.JSONOK(RunResponse{
		Count: count,
		Cost:  time.Since(startedAt).Milliseconds(),
		Keys:  buildQueryLogFields(logs.Logs),
		Logs:  logs.Logs,
		Query: sql,
		SQL:   sql,
		Plan:  plan,
	})
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
	return querycompile.CompileContext{
		TableName:     fmt.Sprintf("`%s`.`%s`", tableInfo.Database.Name, tableInfo.Name),
		TimeField:     tableInfo.GetTimeField(),
		TimeFieldType: tableInfo.TimeFieldType,
		RawJSONColumn: "_raw_log_",
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
