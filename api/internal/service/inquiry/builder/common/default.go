package common

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
)

func BuilderFieldsData(mapping string) string {
	if mapping == "" {
		mapping = `_source_ String,
  _cluster_ String,
  _log_agent_ String,
  _namespace_ String,
  _node_name_ String,
  _node_ip_ String,
  _container_name_ String,
  _pod_name_ String,`
	}
	return fmt.Sprintf(`(
  %s
  _time_second_ DateTime,
  _time_nanosecond_ DateTime64(9, 'Asia/Shanghai'),
  _raw_log_ String CODEC(ZSTD(1)),
  INDEX idx_raw_log _raw_log_ TYPE tokenbf_v1(30720, 2, 0) GRANULARITY 1
)
`, mapping)
}

func BuilderFieldsStream(mapping, timeField, timeTyp, logField string) string {
	if timeField == "" {
		timeField = "_time_"
	}
	if logField == "" {
		logField = "_log_"
	}
	if mapping == "" {
		mapping = `_source_ String,
  _cluster_ String,
  _log_agent_ String,
  _namespace_ String,
  _node_name_ String,
  _node_ip_ String,
  _container_name_ String,
  _pod_name_ String,`
	}
	return fmt.Sprintf(`(
  %s
  %s %s,
  %s String CODEC(ZSTD(1))
)
`, mapping, timeField, timeTyp, logField)
}

func BuilderFieldsView(mapping, logField string, paramsView bumo.ParamsView) string {
	if logField == "" {
		logField = "_log_"
	}
	if mapping == "" {
		mapping = `_source_,
  _cluster_,
  _log_agent_,
  _namespace_,
  _node_name_,
  _node_ip_,
  _container_name_,
  _pod_name_,`
	}
	return fmt.Sprintf(`SELECT
  %s
  %s,
  %s AS _raw_log_%s
FROM %s
`,
		mapping, paramsView.TimeConvert, logField, paramsView.CommonFields, paramsView.SourceTable)
}

func BuilderViewAlarmAggregationSelect(params bumo.Params) string {
	return fmt.Sprintf(`SELECT
  toDate(now()) as date,
  '%s' as name,
  array(%s) as tags,
  toFloat64(val) as val,
  now() as ts,
  toDateTime(now()) as updated
FROM (
  %s
)
`,
		bumo.PrometheusMetricName,
		params.View.CommonFields,
		params.View.WithSQL)
}

func BuilderViewAlarmAggregationWith(params bumo.Params) string {
	return fmt.Sprintf(`with(
	select val from (
		%s
	) limit 1
) as limbo 
SELECT
  toDate(%s) as date,
  '%s' as name,
  array(%s) as tags,
  ifNull(toFloat64(limbo), -1) as val,
  %s as ts,
  toDateTime(%s) as updated
FROM %s
`,
		params.View.WithSQL,
		params.TimeField,
		bumo.PrometheusMetricName,
		params.View.CommonFields,
		params.TimeField,
		params.TimeField,
		params.View.SourceTable)
}

func BuilderEngineStream(stream bumo.ParamsStream) string {
	consumerNum := 1
	if stream.ConsumerNum != 0 {
		consumerNum = stream.ConsumerNum
	}
	return fmt.Sprintf(`ENGINE = Kafka SETTINGS kafka_broker_list = '%s', 
kafka_topic_list = '%s', 
kafka_group_name = '%s', 
kafka_format = 'JSONEachRow', 
kafka_num_consumers = %d,
kafka_skip_broken_messages = %d
`,
		stream.Brokers,
		stream.Topic,
		stream.Group,
		consumerNum,
		stream.KafkaSkipBrokenMessages)

}
