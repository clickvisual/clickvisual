package source

import (
	"database/sql"
	"fmt"
	"reflect"
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type ClickHouse struct {
	s *Source
}

func NewClickHouse(s *Source) *ClickHouse {
	return &ClickHouse{s}
}

func (c *ClickHouse) Databases() (res []string, err error) {
	return c.queryStringArr("SHOW DATABASES")
}

func (c *ClickHouse) Tables(database string) (res []string, err error) {
	quotedDatabase, err := quoteSourceIdentifier(database)
	if err != nil {
		return nil, err
	}
	return c.queryStringArr(fmt.Sprintf("SHOW TABLES FROM %s", quotedDatabase))
}

func (c *ClickHouse) Columns(database, table string) (res []view.Column, err error) {
	conn, err := sql.Open("clickhouse", c.s.GetDSN())
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "sql.error"), elog.String("error", err.Error()))
		return
	}
	conn.SetConnMaxIdleTime(time.Minute * 3)
	defer func() { _ = conn.Close() }()
	list, err := c.doQuery(conn, "select name, type from system.columns where database = ? and table = ?", database, table)
	if err != nil {
		return
	}
	for _, row := range list {
		res = append(res, view.Column{
			Field: row["name"].(string),
			Type:  row["type"].(string),
		})
	}
	return
}

func (c *ClickHouse) Exec(s string) (err error) {
	obj, err := sql.Open("clickhouse", c.s.GetDSN())
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "open"), elog.String("error", err.Error()))
		return
	}
	defer func() { _ = obj.Close() }()
	_, err = obj.Exec(s)
	return
}

func (c *ClickHouse) Query(s string) (res []map[string]interface{}, err error) {
	elog.Info("ClickHouse", elog.FieldComponent("Query"), elog.String("s", s))
	obj, err := sql.Open("clickhouse", c.s.GetDSN())
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "open"), elog.String("error", err.Error()))
		return
	}
	obj.SetConnMaxIdleTime(time.Minute * 3)
	defer func() { _ = obj.Close() }()
	res, err = c.doQuery(obj, s)
	return
}

func (c *ClickHouse) queryStringArr(sq string) (res []string, err error) {
	obj, err := sql.Open("clickhouse", c.s.GetDSN())
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "open"), elog.String("error", err.Error()))
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	// lgtm[go/sql-injection] Metadata queries are assembled from constants and quoted identifiers.
	rows, err := obj.Query(sq)
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "query"), elog.String("error", err.Error()))
		return
	}
	for rows.Next() {
		var tmp string
		errScan := rows.Scan(&tmp)
		if errScan != nil {
			elog.Error("source", elog.String("err", errScan.Error()))
			continue
		}
		res = append(res, tmp)
	}
	return
}

func (c *ClickHouse) doQuery(ins *sql.DB, sqlText string, args ...interface{}) (res []map[string]interface{}, err error) {
	res = make([]map[string]interface{}, 0)
	// lgtm[go/sql-injection] Query execution is a controlled datasource feature; metadata callers use placeholders.
	rows, err := ins.Query(sqlText, args...)
	if err != nil {
		return
	}
	defer func() { _ = rows.Close() }()
	cts, _ := rows.ColumnTypes()
	var (
		fields   = make([]string, len(cts))
		values   = make([]interface{}, len(cts))
		scanArgs = make([]interface{}, len(cts))
	)
	for idx, field := range cts {
		fields[idx] = field.Name()
		scanArgs[idx] = &values[idx]
	}
	for rows.Next() {
		line := make(map[string]interface{}, 0)
		if err = rows.Scan(scanArgs...); err != nil {
			elog.Error("ClickHouse", elog.Any("step", "doQueryNext"), elog.Any("error", err.Error()))
			return
		}
		elog.Debug("ClickHouse", elog.Any("fields", fields), elog.Any("values", values))
		for k := range fields {
			elog.Debug("ClickHouse", elog.Any("fields", fields[k]), elog.Any("values", values[k]))
			line[fields[k]] = normalizeScannedValue(values[k])
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		elog.Error("ClickHouse", elog.Any("step", "doQuery"), elog.Any("error", err.Error()))
		return
	}
	return
}

func normalizeScannedValue(value interface{}) interface{} {
	if value == nil {
		return nil
	}
	rv := reflect.ValueOf(value)
	for rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return nil
		}
		rv = rv.Elem()
	}
	return rv.Interface()
}
