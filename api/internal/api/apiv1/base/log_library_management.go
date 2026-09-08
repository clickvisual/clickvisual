package base

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/factory"
)

type logLibraryJSONPreviewRequest struct {
	DatabaseID int    `json:"databaseId" form:"databaseId"`
	Source     string `json:"source" form:"source"`
}

type logLibraryJSONField struct {
	Key      string `json:"key"`
	Parent   string `json:"parent,omitempty"`
	Path     string `json:"path"`
	Type     string `json:"type"`
	IsTime   bool   `json:"isTime"`
	IsRawLog bool   `json:"isRawLog"`
	Sample   string `json:"-"`
}

type logLibraryJSONCandidate struct {
	Key      string `json:"key"`
	Parent   string `json:"parent,omitempty"`
	Path     string `json:"path"`
	Type     string `json:"type"`
	TimeType int    `json:"timeFieldType,omitempty"`
}

type logLibraryJSONPreview struct {
	Mode            string                    `json:"mode"`
	TableCount      int                       `json:"tableCount"`
	TableRoles      []string                  `json:"tableRoles"`
	TimeField       string                    `json:"timeField"`
	TimeFieldParent string                    `json:"timeFieldParent,omitempty"`
	TimeFieldType   int                       `json:"timeFieldType"`
	RawLogField     string                    `json:"rawLogField"`
	RawLogParent    string                    `json:"rawLogFieldParent,omitempty"`
	Fields          []logLibraryJSONField     `json:"fields"`
	TimeCandidates  []logLibraryJSONCandidate `json:"timeCandidates"`
	RawCandidates   []logLibraryJSONCandidate `json:"rawLogCandidates"`
}

type logLibraryPhysicalTable struct {
	Name    string             `json:"name"`
	Role    string             `json:"role,omitempty"`
	Columns []*view.RespColumn `json:"columns,omitempty"`
	DDL     string             `json:"ddl,omitempty"`
}

type logLibraryPhysicalTableRef struct {
	Database string
	Table    string
	Name     string
	Role     string
}

var logLibraryCreateTableRE = regexp.MustCompile(`(?is)CREATE\s+(?:MATERIALIZED\s+VIEW|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)`)

// LogLibraryManagementPreviewJSON inspects a sample log without creating any
// ClickHouse objects. Cluster mode comes from the selected database's runtime
// cluster configuration; the JSON sample is used only for field inference.
func LogLibraryManagementPreviewJSON(c *core.Context) {
	var req logLibraryJSONPreviewRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
		return
	}
	if req.DatabaseID == 0 || strings.TrimSpace(req.Source) == "" {
		c.JSONE(core.CodeErr, "databaseId and source are required", nil)
		return
	}
	database, err := db.DatabaseInfo(invoker.Db, req.DatabaseID)
	if err != nil || database.ID == 0 {
		if err == nil {
			err = fmt.Errorf("database does not exist")
		}
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	preview, err := inferLogLibraryJSON(req.Source, database.Cluster)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONOK(preview)
}

func inferLogLibraryJSON(source, clusterName string) (logLibraryJSONPreview, error) {
	var root map[string]interface{}
	if err := json.Unmarshal([]byte(source), &root); err != nil {
		return logLibraryJSONPreview{}, fmt.Errorf("source must be a JSON object: %w", err)
	}
	if len(root) == 0 {
		return logLibraryJSONPreview{}, fmt.Errorf("source JSON cannot be empty")
	}
	fields := make([]logLibraryJSONField, 0)
	flattenLogLibraryJSON(root, "", &fields)
	sort.Slice(fields, func(i, j int) bool { return fields[i].Path < fields[j].Path })
	timeField, timeParent, timeType := chooseLogLibraryTimeField(fields)
	rawField, rawParent := chooseLogLibraryRawField(fields)
	timeCandidates := logLibraryTimeCandidates(fields)
	rawCandidates := logLibraryRawCandidates(fields)
	for i := range fields {
		fields[i].IsTime = fields[i].Key == timeField && fields[i].Parent == timeParent
		fields[i].IsRawLog = fields[i].Key == rawField && fields[i].Parent == rawParent
	}
	mode := "standalone"
	roles := []string{"stream", "data", "view"}
	if strings.TrimSpace(clusterName) != "" {
		mode = "cluster"
		roles = append(roles, "distributed")
	}
	return logLibraryJSONPreview{
		Mode: mode, TableCount: len(roles), TableRoles: roles,
		TimeField: timeField, TimeFieldParent: timeParent, TimeFieldType: timeType,
		RawLogField: rawField, RawLogParent: rawParent, Fields: fields,
		TimeCandidates: timeCandidates, RawCandidates: rawCandidates,
	}, nil
}

func logLibraryTimeCandidates(fields []logLibraryJSONField) []logLibraryJSONCandidate {
	result := make([]logLibraryJSONCandidate, 0)
	for _, field := range fields {
		if strings.Contains(field.Parent, ".") || (field.Type != "String" && field.Type != "Float64") || (!isTimeNamed(field.Key) && !isTimeValue(field.Sample, field.Type)) {
			continue
		}
		typ := 1
		if field.Type == "Float64" {
			typ = 2
		}
		result = append(result, logLibraryJSONCandidate{Key: field.Key, Parent: field.Parent, Path: field.Path, Type: field.Type, TimeType: typ})
	}
	sort.SliceStable(result, func(i, j int) bool {
		return timeCandidateRank(result[i].Key) < timeCandidateRank(result[j].Key)
	})
	return result
}

func isTimeNamed(key string) bool { return timeCandidateRank(key) < 100 }

func isTimeValue(value, typ string) bool {
	if typ == "Float64" {
		n, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
		return err == nil && n >= 1e8 && n <= 1e14
	}
	if typ != "String" || strings.TrimSpace(value) == "" {
		return false
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02 15:04:05.999999999", "2006-01-02 15:04:05", "2006/01/02 15:04:05", "2006-01-02"} {
		if _, err := time.Parse(layout, strings.TrimSpace(value)); err == nil {
			return true
		}
	}
	return false
}

func logLibraryRawCandidates(fields []logLibraryJSONField) []logLibraryJSONCandidate {
	result := make([]logLibraryJSONCandidate, 0)
	for _, field := range fields {
		if !strings.Contains(field.Parent, ".") && field.Type == "String" {
			result = append(result, logLibraryJSONCandidate{Key: field.Key, Parent: field.Parent, Path: field.Path, Type: field.Type})
		}
	}
	sort.SliceStable(result, func(i, j int) bool {
		return rawCandidateRank(result[i].Key) < rawCandidateRank(result[j].Key)
	})
	return result
}

func timeCandidateRank(key string) int {
	for i, candidate := range []string{"_time_second_", "event_time", "timestamp", "time", "ts", "startTime", "created_at", "@timestamp"} {
		if strings.EqualFold(key, candidate) {
			return i
		}
	}
	return 100
}

func rawCandidateRank(key string) int {
	for i, candidate := range []string{"_raw_log_", "_log_", "message", "msg", "log", "content", "body"} {
		if strings.EqualFold(key, candidate) {
			return i
		}
	}
	return 100
}

func flattenLogLibraryJSON(values map[string]interface{}, parent string, fields *[]logLibraryJSONField) {
	for key, value := range values {
		path := key
		if parent != "" {
			path = parent + "." + key
		}
		typ := logLibraryJSONType(value)
		*fields = append(*fields, logLibraryJSONField{Key: key, Parent: parent, Path: path, Type: typ, Sample: fmt.Sprint(value)})
		if child, ok := value.(map[string]interface{}); ok {
			flattenLogLibraryJSON(child, path, fields)
		}
	}
}

func logLibraryJSONType(value interface{}) string {
	switch value.(type) {
	case string:
		return "String"
	case float64:
		return "Float64"
	case bool:
		return "Bool"
	case map[string]interface{}:
		return "JSON"
	case []interface{}:
		return "Array"
	default:
		return "Unknown"
	}
}

func chooseLogLibraryTimeField(fields []logLibraryJSONField) (string, string, int) {
	for _, candidate := range []string{"_time_second_", "event_time", "timestamp", "time", "ts", "startTime", "created_at", "@timestamp"} {
		for _, field := range fields {
			if strings.EqualFold(field.Key, candidate) {
				if field.Type == "Float64" {
					return field.Key, field.Parent, 2
				}
				return field.Key, field.Parent, 1
			}
		}
	}
	return "", "", 1
}

func chooseLogLibraryRawField(fields []logLibraryJSONField) (string, string) {
	for _, candidate := range []string{"_raw_log_", "_log_", "message", "msg", "log", "content", "body"} {
		for _, field := range fields {
			if strings.EqualFold(field.Key, candidate) && field.Type == "String" {
				return field.Key, field.Parent
			}
		}
	}
	return "_raw_log_", ""
}

// LogLibraryManagementTableColumns returns the physical columns for a log table.
// The route is mounted under the root-only router group because this endpoint is
// intended for the log library administration page, not normal log querying.
func LogLibraryManagementTableColumns(c *core.Context) {
	tableInfo, database, table, op, ok := loadLogLibraryManagementOperator(c)
	if !ok {
		return
	}
	refs, err := logLibraryPhysicalTableRefs(tableInfo, database, table)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to resolve log library tables: "+err.Error(), nil)
		return
	}
	result := make([]logLibraryPhysicalTable, 0, len(refs))
	for _, ref := range refs {
		columns, listErr := op.ListColumn(ref.Database, ref.Table, false)
		if listErr != nil {
			c.JSONE(core.CodeErr, fmt.Sprintf("failed to load table columns for %s: %s", ref.Name, listErr.Error()), nil)
			return
		}
		result = append(result, logLibraryPhysicalTable{Name: ref.Name, Role: ref.Role, Columns: columns})
	}
	c.JSONOK(struct {
		Tables []logLibraryPhysicalTable `json:"tables"`
	}{Tables: result})
}

// LogLibraryManagementTableDDL returns the read-only CREATE TABLE statement
// for a log table.
func LogLibraryManagementTableDDL(c *core.Context) {
	tableInfo, database, table, op, ok := loadLogLibraryManagementOperator(c)
	if !ok {
		return
	}
	refs, err := logLibraryPhysicalTableRefs(tableInfo, database, table)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to resolve log library tables: "+err.Error(), nil)
		return
	}
	result := make([]logLibraryPhysicalTable, 0, len(refs))
	for _, ref := range refs {
		ddl, ddlErr := op.GetCreateSQL(ref.Database, ref.Table)
		if ddlErr != nil {
			c.JSONE(core.CodeErr, fmt.Sprintf("failed to load table ddl for %s: %s", ref.Name, ddlErr.Error()), nil)
			return
		}
		result = append(result, logLibraryPhysicalTable{Name: ref.Name, Role: ref.Role, DDL: ddl})
	}
	c.JSONOK(struct {
		Tables []logLibraryPhysicalTable `json:"tables"`
	}{Tables: result})
}

func loadLogLibraryManagementOperator(c *core.Context) (db.BaseTable, string, string, factory.Operator, bool) {
	iid := cast.ToInt(c.Param("iid"))
	database := strings.TrimSpace(c.Param("database"))
	table := strings.TrimSpace(c.Param("table"))
	if iid == 0 || database == "" || table == "" {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return db.BaseTable{}, "", "", nil, false
	}
	if _, err := db.InstanceInfo(invoker.Db, iid); err != nil {
		c.JSONE(core.CodeErr, "instance does not exist: "+err.Error(), nil)
		return db.BaseTable{}, "", "", nil, false
	}
	databases, err := db.DatabaseList(invoker.Db, map[string]interface{}{"iid": iid, "name": database})
	if err != nil || len(databases) == 0 {
		if err == nil {
			err = fmt.Errorf("database does not exist")
		}
		c.JSONE(core.CodeErr, err.Error(), nil)
		return db.BaseTable{}, "", "", nil, false
	}
	tableInfo, err := db.TableInfoX(invoker.Db, map[string]interface{}{"did": databases[0].ID, "name": table})
	if err != nil || tableInfo.ID == 0 {
		if err == nil {
			err = fmt.Errorf("table does not exist")
		}
		c.JSONE(core.CodeErr, err.Error(), nil)
		return db.BaseTable{}, "", "", nil, false
	}
	tableInfo, err = db.TableInfo(invoker.Db, tableInfo.ID)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to load table metadata: "+err.Error(), nil)
		return db.BaseTable{}, "", "", nil, false
	}
	if tableInfo.Database == nil || tableInfo.Database.Iid != iid || tableInfo.Database.Name != database {
		c.JSONE(core.CodeErr, "table does not belong to the requested instance and database", nil)
		return db.BaseTable{}, "", "", nil, false
	}
	op, err := service.InstanceManager.Load(iid)
	if err != nil {
		c.JSONE(core.CodeErr, "failed to load instance: "+err.Error(), nil)
		return db.BaseTable{}, "", "", nil, false
	}
	return tableInfo, database, table, op, true
}

func logLibraryPhysicalTableRefs(tableInfo db.BaseTable, database, table string) ([]logLibraryPhysicalTableRef, error) {
	refs := make([]logLibraryPhysicalTableRef, 0, 4)
	seen := make(map[string]struct{})
	add := func(name, role string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		refDatabase, refTable := splitPhysicalTableName(name, database)
		key := refDatabase + "." + refTable
		if refTable == "" {
			return
		}
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		refs = append(refs, logLibraryPhysicalTableRef{Database: refDatabase, Table: refTable, Name: key, Role: role})
	}

	if tableInfo.CreateType == constx.TableCreateTypeBufferNullDataPipe {
		attach := db.BaseTableAttach{Tid: tableInfo.ID}
		if err := attach.Info(invoker.Db); err != nil {
			return nil, err
		}
		for i, name := range attach.Names {
			role := fmt.Sprintf("table-%d", i+1)
			add(name, role)
		}
	} else {
		for _, item := range []struct {
			sql  string
			role string
		}{
			{tableInfo.SqlData, "data"},
			{tableInfo.SqlStream, "stream"},
			{tableInfo.SqlView, "view"},
			{tableInfo.SqlDistributed, "distributed"},
		} {
			match := logLibraryCreateTableRE.FindStringSubmatch(item.sql)
			if len(match) == 2 {
				add(match[1], item.role)
			}
		}
	}
	if len(refs) == 0 {
		add(table, "data")
	}
	return refs, nil
}

func splitPhysicalTableName(name, defaultDatabase string) (string, string) {
	parts := strings.Split(strings.TrimSpace(name), ".")
	for i := range parts {
		parts[i] = strings.Trim(strings.TrimSpace(parts[i]), "`'\";\n\r\t")
	}
	if len(parts) >= 2 {
		return parts[len(parts)-2], parts[len(parts)-1]
	}
	return defaultDatabase, strings.TrimSpace(parts[0])
}
