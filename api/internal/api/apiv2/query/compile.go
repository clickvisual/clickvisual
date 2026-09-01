package query

import (
	"fmt"
	"strings"

	"github.com/ego-component/egorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/querycompile"
)

type CompileResponse struct {
	SQL  string         `json:"sql"`
	Plan view.QueryPlan `json:"plan"`
}

// Compile godoc
// @Summary      编译结构化查询
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/compile [post]
func Compile(c *core.Context) {
	var req view.QueryRequestV2
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	ctx, err := buildCompileContext(req.Tid)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	sql, plan, err := querycompile.Compile(req, ctx)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(CompileResponse{
		SQL:  sql,
		Plan: plan,
	})
}

func buildCompileContext(tid int) (querycompile.CompileContext, error) {
	if tid == 0 || invoker.Db == nil {
		return querycompile.CompileContext{
			TableName:     "`default`.`logs`",
			TimeField:     "_time_second_",
			TimeFieldType: dbmodel.TimeFieldTypeDT,
			RawJSONColumn: "_raw_log_",
		}, nil
	}
	tableInfo, err := dbmodel.TableInfo(invoker.Db, tid)
	if err != nil {
		return querycompile.CompileContext{}, err
	}
	if tableInfo.Name == "" || tableInfo.Database == nil {
		return querycompile.CompileContext{}, fmt.Errorf("table %d not found", tid)
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
	}, nil
}

func rawLogColumnForTable(createType int, rawLogField string, rawLogFieldExists bool, defaultRawLogExists bool) (string, bool) {
	rawLogField = strings.TrimSpace(rawLogField)
	if createType == constx.TableCreateTypeExist && rawLogField != "" && rawLogFieldExists {
		return rawLogField, false
	}
	if createType == constx.TableCreateTypeExist {
		if defaultRawLogExists {
			return "_raw_log_", false
		}
		return "", true
	}
	return "_raw_log_", false
}

func rawLogColumnAvailability(tableInfo dbmodel.BaseTable) (rawLogFieldExists bool, defaultRawLogExists bool) {
	rawLogField := strings.TrimSpace(tableInfo.RawLogField)
	rawLogFieldExists = rawLogField != "" && tableColumnRecorded(tableInfo.ID, rawLogField)
	defaultRawLogExists = tableColumnRecorded(tableInfo.ID, "_raw_log_")
	if tableInfo.CreateType != constx.TableCreateTypeExist {
		return rawLogFieldExists, defaultRawLogExists
	}
	if rawLogField != "" && rawLogFieldExists {
		return rawLogFieldExists, defaultRawLogExists
	}
	if rawLogField == "" && defaultRawLogExists {
		return rawLogFieldExists, defaultRawLogExists
	}
	columns := tablePhysicalColumns(tableInfo)
	if rawLogField != "" && columns[rawLogField] {
		rawLogFieldExists = true
	}
	if columns["_raw_log_"] {
		defaultRawLogExists = true
	}
	return rawLogFieldExists, defaultRawLogExists
}

func tablePhysicalColumns(tableInfo dbmodel.BaseTable) map[string]bool {
	columns := make(map[string]bool)
	if tableInfo.Database == nil || tableInfo.Database.Name == "" || tableInfo.Name == "" {
		return columns
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		return columns
	}
	list, err := op.ListColumn(tableInfo.Database.Name, tableInfo.Name, false)
	if err != nil {
		return columns
	}
	for _, item := range list {
		if item == nil {
			continue
		}
		name := strings.TrimSpace(item.Name)
		if name != "" {
			columns[name] = true
		}
	}
	return columns
}

func tableColumnRecorded(tid int, field string) bool {
	field = strings.TrimSpace(field)
	if tid <= 0 || field == "" || invoker.Db == nil {
		return false
	}
	indexes, err := dbmodel.IndexList(egorm.Conds{"tid": tid})
	if err != nil {
		return false
	}
	for _, index := range indexes {
		if index == nil {
			continue
		}
		if index.GetFieldName() == field || strings.TrimSpace(index.Field) == field {
			return true
		}
	}
	return false
}
