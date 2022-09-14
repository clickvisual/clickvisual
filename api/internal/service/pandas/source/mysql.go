package source

import (
	"fmt"
	"reflect"

	"github.com/gotomicro/ego/core/elog"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
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
	rows, err := obj.Debug().Raw(fmt.Sprintf("SHOW FULL COLUMNS FROM %s FROM %s", table, database)).Rows()
	if err != nil {
		return
	}
	var (
		Field      string
		Type       string
		Collation  string
		Null       string
		Key        string
		Default    interface{}
		Extra      string
		Privileges string
		Comment    string
	)
	for rows.Next() {
		errScan := rows.Scan(&Field, &Type, &Collation, &Null, &Key, &Default, &Extra, &Privileges, &Comment)
		if errScan != nil {
			invoker.Logger.Error("source", elog.String("err", errScan.Error()))
			continue
		}
		res = append(res, view.Column{
			Field:   Field,
			Type:    Type,
			Comment: Comment,
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
		for k := range fields {
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
