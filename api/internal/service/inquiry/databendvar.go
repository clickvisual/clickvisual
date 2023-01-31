package inquiry

const (
	defaultDatabendStringTimeParse = `parseDateTimeBestEffort(%s) AS _time_second_,
  to_timestamp(parseDateTimeBestEffort(%s), 9) AS _time_nanosecond_`
	defaultDatabendFloatTimeParse = `to_timestamp(AS_INTEGER(%s)) AS _time_second_,
  as_float(AS_INTEGER(%s*1000000000)) AS _time_nanosecond_`
	defaultDatabendCondition = "1=1"
)

const (
	databendFloatTimeParse = `to_timestamp(AS_INTEGER(%s)) AS _time_second_,
as_float(AS_INTEGER(%s*1000000000)) AS _time_nanosecond_`
)

const (
	databendFloatTimeParseV3 = `to_timestamp(AS_INTEGER(json_extract_path_text(%s, '%s'))) AS _time_second_,
  AS_INTEGER(json_extract_path_text(%s, '%s')*1000000000) AS _time_nanosecond_`
)

// time_field 高精度数据解析选择
var (
	databendNanoSecondTimeParse = databendFloatTimeParseV3
)
