package source

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/pkg/utils"
)

type Operator interface {
	Databases() ([]string, error)
	Tables(string) ([]string, error)
	Columns(string, string) ([]view.Column, error)
	Query(s string) (res []map[string]interface{}, err error)
	Exec(s string) error
}

func Instantiate(s *Source) Operator {
	switch s.Typ {
	case db.SourceTypClickHouse:
		return NewClickHouse(s)
	case db.SourceTypMySQL:
		return NewMySQL(s)
	case db.SourceDatabend:
		return NewDatabend(s)
	}
	return nil
}

type Source struct {
	DSN      string
	URL      string
	UserName string
	Password string
	Typ      int
}

func (s *Source) GetDSN() string {
	if s.DSN != "" {
		return utils.ClickhouseDsnConvert(s.DSN)
	}
	switch s.Typ {
	case db.SourceTypClickHouse:
		return fmt.Sprintf("clickhouse://%s:%s@%s/%s", s.UserName, s.Password, s.URL, "default")
	case db.SourceTypMySQL:
		return fmt.Sprintf("%s:%s@tcp(%s)/sys", s.UserName, s.Password, s.URL)
	case db.SourceDatabend:
		return fmt.Sprintf("databend://%s:%s@%s/%s", s.UserName, s.Password, s.URL, "default")
	}
	return ""
}
