package query

import (
	"fmt"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
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
	return querycompile.CompileContext{
		TableName:     fmt.Sprintf("`%s`.`%s`", tableInfo.Database.Name, tableInfo.Name),
		TimeField:     tableInfo.GetTimeField(),
		TimeFieldType: tableInfo.TimeFieldType,
		RawJSONColumn: rawLogColumnOrDefault(tableInfo.RawLogField),
	}, nil
}

func rawLogColumnOrDefault(rawLogField string) string {
	rawLogField = strings.TrimSpace(rawLogField)
	if rawLogField == "" {
		return "_raw_log_"
	}
	return rawLogField
}
