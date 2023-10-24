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
	TableCreateType  int
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
	TableName               string
	TableTyp                string
	Brokers                 string
	Topic                   string
	Group                   string
	ConsumerNum             int
	KafkaSkipBrokenMessages int
}

type ParamsView struct {
	WithSQL          string
	ViewType         int
	ViewTable        string
	TargetTable      string
	CommonFields     string
	SourceTable      string
	Where            string
	TimeConvert      string
	IsKafkaTimestamp int
}

const PrometheusMetricName = "clickvisual_alert_metrics"

const (
	ViewTypePrometheusMetric            = 1
	ViewTypePrometheusMetricAggregation = 2
)

const (
	DataTypeDistributed = 1
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
