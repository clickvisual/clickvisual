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
	Cluster          string
	ReplicaStatus    int
	KafkaJsonMapping string
	LogField         string
	TimeField        string
	Data             ParamsData
	View             ParamsView
	Stream           ParamsStream
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
	WithSQL      string
	ViewType     int
	ViewTable    string
	TargetTable  string
	CommonFields string
	SourceTable  string
	Where        string
	TimeConvert  string
}

const PrometheusMetricName = "clickvisual_alert_metrics"

const (
	ViewTypeDefault = iota
	ViewTypePrometheusMetric
	ViewTypePrometheusMetricAggregation
)

const (
	DataTypeDefault = iota
	DataTypeDistributed
)

const (
	ReplicaStatusYes = iota
	ReplicaStatusNo
)

func (q *QueryAssembly) Gen() string {
	var res string
	res = strings.TrimSuffix(q.Result, "\n")
	res += ";"
	return res
}
