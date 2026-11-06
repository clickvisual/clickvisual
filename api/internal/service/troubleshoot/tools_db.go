package troubleshoot

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/ego-component/egorm"

	queryv2 "github.com/clickvisual/clickvisual/api/internal/api/apiv2/query"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	reportservice "github.com/clickvisual/clickvisual/api/internal/service/report"
)

const maxCatalogTables = 80

type dbCatalog struct{}

type dbRunner struct{}

func (dbCatalog) List(_ context.Context, uid int) ([]tableBrief, error) {
	if invoker.Db == nil {
		return nil, fmt.Errorf("db is nil")
	}
	tables, err := dbmodel.TableList(invoker.Db, egorm.Conds{})
	if err != nil {
		return nil, err
	}
	if len(tables) > 200 {
		tables = tables[:200]
	}
	out := make([]tableBrief, 0, min(len(tables), maxCatalogTables))
	for _, table := range tables {
		if table == nil || !canViewTable(uid, *table) {
			continue
		}
		out = append(out, briefFromTable(*table))
		if len(out) >= maxCatalogTables {
			break
		}
	}
	return out, nil
}

func authorizedTable(uid int, tid int) (dbmodel.BaseTable, error) {
	if invoker.Db == nil {
		return dbmodel.BaseTable{}, fmt.Errorf("db is nil")
	}
	table, err := dbmodel.TableInfo(invoker.Db, tid)
	if err != nil {
		return dbmodel.BaseTable{}, err
	}
	if table.ID == 0 || table.Database == nil {
		return dbmodel.BaseTable{}, fmt.Errorf("日志表 %d 不存在", tid)
	}
	if !canViewTable(uid, table) {
		return dbmodel.BaseTable{}, fmt.Errorf("没有日志表 %d 的查询权限", tid)
	}
	return table, nil
}

func (dbCatalog) CheckAccess(_ context.Context, uid int, tid int) error {
	_, err := authorizedTable(uid, tid)
	return err
}

func (dbCatalog) Describe(_ context.Context, uid int, tid int) (tableDetail, error) {
	table, err := authorizedTable(uid, tid)
	if err != nil {
		return tableDetail{}, err
	}
	detail := tableDetail{tableBrief: briefFromTable(table)}
	columns, err := reportservice.ListTableColumns(table.Database.Iid, table.Database.Name, table.Name)
	if err == nil {
		if len(columns) > 40 {
			columns = columns[:40]
		}
		detail.Columns = columns
	}
	return detail, nil
}

func (dbRunner) Run(ctx context.Context, uid int, req view.QueryRequestV2) (queryHit, error) {
	resp, err := queryv2.ExecuteForUser(ctx, uid, req)
	if err != nil {
		return queryHit{}, err
	}
	return queryHit{
		Count:   resp.Count,
		SQL:     resp.SQL,
		Preview: previewLogs(resp.Logs, 8),
	}, nil
}

func canViewTable(uid int, table dbmodel.BaseTable) bool {
	if uid <= 0 || table.Database == nil || table.Database.Iid == 0 || table.ID == 0 {
		return false
	}
	err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      uid,
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(table.Database.Iid),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActView},
		DomainType:  pmsplugin.PrefixTable,
		DomainId:    strconv.Itoa(table.ID),
	})
	return err == nil
}

func briefFromTable(table dbmodel.BaseTable) tableBrief {
	brief := tableBrief{
		ID:        table.ID,
		Name:      table.Name,
		Desc:      table.Desc,
		TimeField: table.GetTimeField(),
	}
	if table.Database != nil {
		brief.Database = table.Database.Name
		brief.InstanceID = table.Database.Iid
	}
	return brief
}

func previewLogs(logs []map[string]interface{}, limit int) string {
	if len(logs) == 0 {
		return "没有匹配日志"
	}
	limit = min(limit, len(logs))
	lines := make([]string, 0, limit)
	for i := 0; i < limit; i++ {
		raw, err := json.MarshalIndent(logs[i], "", "  ")
		if err != nil {
			lines = append(lines, fmt.Sprintf("%d. 日志无法序列化：%s", i+1, err))
			continue
		}
		lines = append(lines, fmt.Sprintf("%d. %s", i+1, raw))
	}
	preview := strings.Join(lines, "\n\n")
	if len([]rune(preview)) > 6000 {
		preview = trimRunes(preview, 6000) + "\n（内容较长，已截断）"
	}
	return preview
}
