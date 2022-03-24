package bumo

import (
	"strings"
)

// builder model = bumo

// QueryAssembly all in one
type QueryAssembly struct {
	Params  Params
	Create  string
	Fields  string
	Where   string
	Engine  string
	Order   string
	TTL     string
	Setting string
	result  string
}

type Params struct {
	// data
	TableName string
	Days      int
	// stream
	TimeTyp     string
	Brokers     string
	Topic       string
	Group       string
	ConsumerNum int
	// view
	ViewTable    string
	TargetTable  string
	TimeField    string
	CommonFields string
	SourceTable  string
	Where        string
}

func (q *QueryAssembly) Gen() string {
	var res string
	if q.Create != "" {
		res += q.Create
	}
	if q.Fields != "" {
		res += q.Fields
	}
	if q.Where != "" {
		res += q.Where
	}
	if q.Engine != "" {
		res += q.Engine
	}
	if q.Order != "" {
		res += q.Order
	}
	if q.TTL != "" {
		res += q.TTL
	}
	if q.Setting != "" {
		res += q.Setting
	}
	res = strings.TrimSuffix(res, "\n")
	res += ";"
	return res
}
