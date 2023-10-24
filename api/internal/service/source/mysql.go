package source

import (
	"fmt"
	"reflect"

	"github.com/gotomicro/ego/core/elog"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
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

func (c *MySQL) Columns(database, table string) (res []view.Column, err error) {
	obj, err := gorm.Open("mysql", c.s.GetDSN())
	if err != nil {
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := c.Query(fmt.Sprintf("SHOW FULL COLUMNS FROM %s FROM %s", table, database))
	if err != nil {
		return
	}
	for _, row := range rows {
		res = append(res, view.Column{
			Field:   row["Field"].(string),
			Type:    row["Type"].(string),
			Comment: row["Comment"].(string),
		})
	}
	return
}

func (c *MySQL) Exec(s string) (err error) {
	obj, err := gorm.Open("mysql", c.s.GetDSN())
	if err != nil {
		return
	}
	defer func() { _ = obj.Close() }()
	return obj.Exec(s).Error
}

func (c *MySQL) Query(s string) (res []map[string]interface{}, err error) {
	res = make([]map[string]interface{}, 0)
	obj, err := gorm.Open("mysql", c.s.GetDSN())
	if err != nil {
		return
	}
	defer func() { _ = obj.Close() }()
	// query databases
	rows, err := obj.Raw(s).Rows()
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
			values[idx] = reflect.ValueOf(&values[idx]).Elem().Addr().Interface()
		}
		if err = rows.Scan(values...); err != nil {
			elog.Error("ClickHouse", elog.Any("step", "doQueryNext"), elog.Any("error", err.Error()))
			return
		}
		for k := range fields {
			elog.Debug("ClickHouse", elog.Any("fields", fields[k]), elog.Any("values", values[k]),
				elog.Any("type", cts[k].ScanType().Elem()))
			line[fields[k]] = transformVal(values[k])
		}
		res = append(res, line)
	}
	if err = rows.Err(); err != nil {
		elog.Error("ClickHouse", elog.Any("step", "doQuery"), elog.Any("error", err.Error()))
		return
	}
	return
}

// isEmpty filter empty index value
func transformVal(input interface{}) interface{} {
	switch input := input.(type) {
	case []uint8:
		return string(input)
	case string:
		return input
	case uint16:
		return fmt.Sprintf("%d", input)
	case uint64:
		return fmt.Sprintf("%d", input)
	case int32:
		return fmt.Sprintf("%d", input)
	case int64:
		return fmt.Sprintf("%d", input)
	case float64:
		return fmt.Sprintf("%f", input)
	default:
		elog.Debug("ClickHouse", elog.FieldComponent("transformVal"),
			elog.Any("type", reflect.TypeOf(input)))
		if reflect.TypeOf(input) == nil {
			return ""
		}
		return ""
	}
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
			elog.Error("source", elog.String("err", errScan.Error()))
			continue
		}
		res = append(res, tmp)
	}
	return
}
