package source

import (
	"database/sql"
	"fmt"
	"reflect"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
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
	return c.queryStringArr(fmt.Sprintf("SHOW TABLES FROM %s", database))
}

func (c *ClickHouse) Columns(database, table string) (res []Column, err error) {
	obj, err := sql.Open("clickhouse", c.s.GetDSN())
	if err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "sql.error"), elog.String("error", err.Error()))
		return
	}
	defer func() { _ = obj.Close() }()
	query := fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s'", database, table)
	list, err := c.doQuery(obj, query)
	if err != nil {
		return
	}
	for _, row := range list {
		res = append(res, Column{
			Field: row["name"].(string),
			Type:  row["type"].(string),
		})
	}
	return
}

func (c *ClickHouse) queryStringArr(sq string) (res []string, err error) {
	obj, err := sql.Open("clickhouse", c.s.GetDSN())
	if err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "sql.error"), elog.String("error", err.Error()))
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := obj.Query(sq)
	for rows.Next() {
		var tmp string
		errScan := rows.Scan(&tmp)
		if errScan != nil {
			invoker.Logger.Error("source", elog.String("err", errScan.Error()))
			continue
		}
		res = append(res, tmp)
	}
	return
}

func (c *ClickHouse) doQuery(ins *sql.DB, sql string) (res []map[string]interface{}, err error) {
	res = make([]map[string]interface{}, 0)
	rows, err := ins.Query(sql)
	if err != nil {
		return
	}
	defer func() { _ = rows.Close() }()
	cts, _ := rows.ColumnTypes()
	var (
		fields = make([]string, len(cts))
		values = make([]interface{}, len(cts))
	)
	for idx, field := range cts {
		fields[idx] = field.Name()
	}
	for rows.Next() {
		line := make(map[string]interface{}, 0)
		for idx := range values {
			fieldValue := reflect.ValueOf(&values[idx]).Elem()
			values[idx] = fieldValue.Addr().Interface()
		}
		if err = rows.Scan(values...); err != nil {
			invoker.Logger.Error("ClickHouse", elog.Any("step", "doQueryNext"), elog.Any("error", err.Error()))
			return
		}
		invoker.Logger.Debug("ClickHouse", elog.Any("fields", fields), elog.Any("values", values))
		for k, _ := range fields {
			invoker.Logger.Debug("ClickHouse", elog.Any("fields", fields[k]), elog.Any("values", values[k]))
			line[fields[k]] = values[k]
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "doQuery"), elog.Any("error", err.Error()))
		return
	}
	return
}
