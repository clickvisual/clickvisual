package bumo

import (
	"strings"
)

// builder model = bumo

// QueryAssembly all in one
type QueryAssembly struct {
	Params Params
	Result string
}

type Params struct {
	Data   ParamsData
	Stream ParamsStream
	View   ParamsView
}

type ParamsData struct {
	TableName string
	Days      int
}

type ParamsStream struct {
	TableName   string
	TimeTyp     string
	Brokers     string
	Topic       string
	Group       string
	ConsumerNum int
}

const PrometheusMetricName = "mogo_alert_metrics"

const (
	ViewTypeDefault = iota
	ViewTypePrometheusMetric
)

type ParamsView struct {
	ViewType     int
	ViewTable    string
	TargetTable  string
	TimeField    string
	CommonFields string
	SourceTable  string
	Where        string
}

func (q *QueryAssembly) Gen() string {
	var res string
	res = strings.TrimSuffix(q.Result, "\n")
	res += ";"
	return res
}
