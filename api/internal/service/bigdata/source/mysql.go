package source

import (
	"fmt"
	"reflect"

	"github.com/gotomicro/ego/core/elog"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

type MySQL struct {
	s *Source
}

func NewMySQL(s *Source) *MySQL {
	return &MySQL{s}
}

func (c *MySQL) Databases() (res []string, err error) {
	return c.queryStringArr("SHOW DATABASES")
}

func (c *MySQL) Tables(database string) (res []string, err error) {
	return c.queryStringArr(fmt.Sprintf("SHOW TABLES FROM %s", database))
}

func (c *MySQL) Columns(database, table string) (res []Column, err error) {
	obj, err := gorm.Open("mysql", c.s.GetDSN())
	if err != nil {
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := obj.Debug().Raw(fmt.Sprintf("SHOW COLUMNS FROM %s FROM %s", table, database)).Rows()
	if err != nil {
		return
	}
	var (
		Field   string
		Type    string
		Null    string
		Key     string
		Default interface{}
		Extra   string
	)
	for rows.Next() {
		errScan := rows.Scan(&Field, &Type, &Null, &Key, &Default, &Extra)
		if errScan != nil {
			invoker.Logger.Error("source", elog.String("err", errScan.Error()))
			continue
		}
		res = append(res, Column{
			Field: Field,
			Type:  Type,
		})
	}
	return
}

func (c *MySQL) queryStringArr(sq string) (res []string, err error) {
	obj, err := gorm.Open("mysql", c.s.GetDSN())
	if err != nil {
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := obj.Debug().Raw(sq).Rows()
	if err != nil {
		return
	}
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

func (c *MySQL) Query(s string) (res []map[string]interface{}, err error) {
	res = make([]map[string]interface{}, 0)
	obj, err := gorm.Open("mysql", c.s.GetDSN())
	if err != nil {
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := obj.Debug().Raw(s).Rows()
	if err != nil {
		return
	}
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
		for k, _ := range fields {
			invoker.Logger.Debug("ClickHouse", elog.Any("fields", fields[k]), elog.Any("values", values[k]))
			// if isEmpty(values[k]) {
			// 	line[fields[k]] = ""
			// } else {
			line[fields[k]] = values[k]
			// }
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "doQuery"), elog.Any("error", err.Error()))
		return
	}
	return
}
