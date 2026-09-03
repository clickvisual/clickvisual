package base

import (
	"strings"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory"
)

// LogLibraryManagementTableColumns returns the physical columns for a log table.
// The route is mounted under the root-only router group because this endpoint is
// intended for the log library administration page, not normal log querying.
func LogLibraryManagementTableColumns(c *core.Context) {
	_, database, table, op, ok := loadLogLibraryManagementOperator(c)
	if !ok {
		return
	}
	columns, err := op.ListColumn(database, table, false)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to load table columns: "+err.Error(), nil)
		return
	}
	c.JSONOK(columns)
}

// LogLibraryManagementTableDDL returns the read-only CREATE TABLE statement
// for a log table.
func LogLibraryManagementTableDDL(c *core.Context) {
	_, database, table, op, ok := loadLogLibraryManagementOperator(c)
	if !ok {
		return
	}
	ddl, err := op.GetCreateSQL(database, table)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to load table ddl: "+err.Error(), nil)
		return
	}
	c.JSONOK(struct {
		DDL string `json:"ddl"`
	}{DDL: ddl})
}

func loadLogLibraryManagementOperator(c *core.Context) (int, string, string, factory.Operator, bool) {
	iid := cast.ToInt(c.Param("iid"))
	database := strings.TrimSpace(c.Param("database"))
	table := strings.TrimSpace(c.Param("table"))
	if iid == 0 || database == "" || table == "" {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return 0, "", "", nil, false
	}
	if _, err := db.InstanceInfo(invoker.Db, iid); err != nil {
		c.JSONE(core.CodeErr, "instance does not exist: "+err.Error(), nil)
		return 0, "", "", nil, false
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to load instance: "+err.Error(), nil)
		return 0, "", "", nil, false
	}
	return iid, database, table, op, true
}
