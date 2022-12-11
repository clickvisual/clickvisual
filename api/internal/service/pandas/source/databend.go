package source

import (
	"database/sql"
	"fmt"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/gotomicro/ego/core/elog"
	"reflect"
	"time"

	_ "github.com/databendcloud/databend-go"
)

type Databend struct {
	s *Source
}

func NewDatabend(s *Source) *Databend {
	return &Databend{s}
}

func (d *Databend) Databases() (res []string, err error) {
	return d.queryStringArr("SHOW DATABASES")
}

func (c *Databend) Tables(database string) (res []string, err error) {
	return c.queryStringArr(fmt.Sprintf("SHOW TABLES FROM %s", database))
}

func (c *Databend) Columns(database, table string) (res []view.Column, err error) {
	conn, err := sql.Open("databend", c.s.GetDSN())
	if err != nil {
		elog.Error("Databend", elog.Any("step", "sql.error"), elog.String("error", err.Error()))
		return
	}
	conn.SetConnMaxIdleTime(time.Minute * 3)
	defer func() { _ = conn.Close() }()
	query := fmt.Sprintf("select name, type from system.columns where database = '%s' and table = '%s'", database, table)
	list, err := c.doQuery(conn, query)
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

func (c *Databend) Exec(s string) (err error) {
	obj, err := sql.Open("databend", c.s.GetDSN())
	if err != nil {
		elog.Error("Databend", elog.Any("step", "open"), elog.String("error", err.Error()))
		return
	}
	defer func() { _ = obj.Close() }()
	_, err = obj.Exec(s)
	return
}

func (c *Databend) Query(s string) (res []map[string]interface{}, err error) {
	elog.Info("Databend", elog.FieldComponent("Query"), elog.String("s", s))
	return
}

func (c *Databend) queryStringArr(sq string) (res []string, err error) {
	obj, err := sql.Open("databend", c.s.GetDSN())
	if err != nil {
		elog.Error("ClickHouse", elog.Any("step", "open"), elog.String("error", err.Error()))
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := obj.Query(sq)
	if err != nil {
		elog.Error("Databend", elog.Any("step", "query"), elog.String("error", err.Error()))
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

func (c *Databend) doQuery(ins *sql.DB, sql string) (res []map[string]interface{}, err error) {
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
			elog.Error("Databend", elog.Any("step", "doQueryNext"), elog.Any("error", err.Error()))
			return
		}
		elog.Debug("Databend", elog.Any("fields", fields), elog.Any("values", values))
		for k := range fields {
			elog.Debug("Databend", elog.Any("fields", fields[k]), elog.Any("values", values[k]))
			line[fields[k]] = values[k]
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		elog.Error("Databend", elog.Any("step", "doQuery"), elog.Any("error", err.Error()))
		return
	}
	return
}
