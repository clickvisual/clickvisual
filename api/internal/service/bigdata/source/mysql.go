package source

import (
	"fmt"

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
