package source

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type Operator interface {
	Databases() ([]string, error)
	Tables(string) ([]string, error)
	Columns(string, string) ([]Column, error)
	Query(s string) (res []map[string]interface{}, err error)
}

func Instantiate(s *Source) Operator {
	switch s.Typ {
	case db.SourceTypClickHouse:
		return NewClickHouse(s)
	case db.SourceTypMySQL:
		return NewMySQL(s)
	}
	return nil
}

type Column struct {
	Field string `json:"field"`
	Type  string `json:"type"`
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
		return s.DSN
	}
	switch s.Typ {
	case db.SourceTypClickHouse:
		return fmt.Sprintf("tcp://%s?username=%s&password=%s", s.URL, s.UserName, s.Password)
	case db.SourceTypMySQL:
		return fmt.Sprintf("%s:%s@tcp(%s)/sys", s.UserName, s.Password, s.URL)
	}
	return ""
}
