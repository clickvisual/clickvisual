package inquiry

const (
	ModeStandalone int = 0
	ModeCluster    int = 1
)

const (
	defaultStringTimeParse = `parseDateTimeBestEffort(%s) AS _time_second_,
  toDateTime64(parseDateTimeBestEffort(%s), 9) AS _time_nanosecond_`
	defaultFloatTimeParse = `toDateTime(toInt64(%s)) AS _time_second_,
  fromUnixTimestamp64Nano(toInt64(%s*1000000000)) AS _time_nanosecond_`
	defaultCondition = "1='1'"
)

const (
	defaultStringTimeParseV3 = `parseDateTimeBestEffort(JSONExtractString(%s, '%s')) AS _time_second_,
  toDateTime64(parseDateTimeBestEffort(JSONExtractString(%s, '%s')), 9) AS _time_nanosecond_`
	defaultFloatTimeParseV3 = `toDateTime(toInt64(JSONExtractFloat(%s, '%s'))) AS _time_second_,
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(%s, '%s')*1000000000)) AS _time_nanosecond_`
)

// time_field 高精度数据解析选择
var nanosecondTimeParse = `toDateTime(toInt64(JSONExtractFloat(%s, '%s'))) AS _time_second_, 
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(%s, '%s')*1000000000)) AS _time_nanosecond_`

var typORM = map[int]string{
	-2: "DateTime64(3)",
	-1: "DateTime",
	0:  "String",
	1:  "Int64",
	2:  "Float64",
	3:  "JSON",
	4:  "UInt64",
}

var jsonExtractORM = map[int]string{
	0: "toString",
	1: "toInt64OrNull",
	2: "toFloat64OrNull",
}
