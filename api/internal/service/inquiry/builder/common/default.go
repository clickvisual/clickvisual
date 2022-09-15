package common

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
)

func BuilderFieldsData(tableCreateType int, mapping string) string {
	if tableCreateType == constx.TableCreateTypeUBW {
		return fmt.Sprintf(`(
  _time_second_ DateTime,
  _time_nanosecond_ DateTime64(9, 'Asia/Shanghai'),
  _key String CODEC(ZSTD(1)),
  _raw_log_ String CODEC(ZSTD(1)),
	_headers.name Array(String),
  INDEX idx_raw_log _raw_log_ TYPE tokenbf_v1(30720, 2, 0) GRANULARITY 1
)
`)
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
  _time_second_ DateTime,
  _time_nanosecond_ DateTime64(9, 'Asia/Shanghai'),
  _raw_log_ String CODEC(ZSTD(1)),
  INDEX idx_raw_log _raw_log_ TYPE tokenbf_v1(30720, 2, 0) GRANULARITY 1
)
`, mapping)
}

func BuilderFieldsStream(tableCreateType int, mapping, timeField, timeTyp, logField string) string {
	if tableCreateType == constx.TableCreateTypeUBW {
		return fmt.Sprintf(`(
  body String
)
`)
	}
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

func BuilderFieldsView(tableCreateType int, mapping, logField string, paramsView bumo.ParamsView) string {
	if tableCreateType == constx.TableCreateTypeUBW {
		if paramsView.IsKafkaTimestamp == 1 {
			// use kafka timestamp
			return fmt.Sprintf(`SELECT
	toDateTime(toInt64(_timestamp)) AS _time_second_,
	toDateTime64(toInt64(_timestamp_ms), 9, 'Asia/Shanghai') AS _time_nanosecond_,
	_key AS _key,
	_headers_name Array(String),
    _headers_value Array(String),
	body AS _raw_log_%s
FROM %s
`, paramsView.CommonFields, paramsView.SourceTable)
		}
		// log time field
		return fmt.Sprintf(`SELECT
  %s,
  _key AS _key,
  body AS _raw_log_%s
FROM %s
`, paramsView.TimeConvert, paramsView.CommonFields, paramsView.SourceTable)
	}
	// v1 or v2
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

func BuilderEngineStream(tableCreateType int, stream bumo.ParamsStream) string {
	kafkaFormat := "JSONEachRow"
	if tableCreateType == constx.TableCreateTypeUBW {
		kafkaFormat = "JSONAsString"

	}
	consumerNum := 1
	if stream.ConsumerNum != 0 {
		consumerNum = stream.ConsumerNum
	}
	return fmt.Sprintf(`ENGINE = Kafka SETTINGS kafka_broker_list = '%s', 
kafka_topic_list = '%s', 
kafka_group_name = '%s', 
kafka_format = '%s', 
kafka_num_consumers = %d,
kafka_skip_broken_messages = %d
`,
		stream.Brokers,
		stream.Topic,
		stream.Group,
		kafkaFormat,
		consumerNum,
		stream.KafkaSkipBrokenMessages)
}
