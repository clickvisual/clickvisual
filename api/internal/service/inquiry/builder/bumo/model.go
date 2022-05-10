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
	Cluster string
	Data    ParamsData
	View    ParamsView
	Stream  ParamsStream
}

type ParamsData struct {
	DataType    int
	TableName   string
	Days        int
	SourceTable string
}

type ParamsStream struct {
	TableName   string
	TimeTyp     string
	Brokers     string
	Topic       string
	Group       string
	ConsumerNum int
}

type ParamsView struct {
	ViewType     int
	ViewTable    string
	TargetTable  string
	TimeField    string
	CommonFields string
	SourceTable  string
	Where        string
}

const PrometheusMetricName = "clickvisual_alert_metrics"

const (
	ViewTypeDefault = iota
	ViewTypePrometheusMetric
)

const (
	DataTypeDefault = iota
	DataTypeDistributed
	DataTypeClusterNoReplicas
)

func (q *QueryAssembly) Gen() string {
	var res string
	res = strings.TrimSuffix(q.Result, "\n")
	res += ";"
	return res
}
