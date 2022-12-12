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
	databendFloatTimeParse = `to_timestamp(AS_INTEGER(%s)) AS _time_second_,
  as_float(AS_INTEGER(%s*1000000000)) AS _time_nanosecond_`
	defaultCondition = "1='1'"
)

const (
	defaultStringTimeParseV3 = `parseDateTimeBestEffort(JSONExtractString(%s, '%s')) AS _time_second_,
  toDateTime64(parseDateTimeBestEffort(JSONExtractString(%s, '%s')), 9) AS _time_nanosecond_`
	defaultFloatTimeParseV3 = `toDateTime(toInt64(JSONExtractFloat(%s, '%s'))) AS _time_second_,
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(%s, '%s')*1000000000)) AS _time_nanosecond_`
	databendFloatTimeParseV3 = `to_timestamp(AS_INTEGER(json_extract_path_text(%s, '%s'))) AS _time_second_,
  AS_INTEGER(json_extract_path_text(%s, '%s')*1000000000) AS _time_nanosecond_`
)

// time_field 高精度数据解析选择
var (
	nanosecondTimeParse = `toDateTime(toInt64(JSONExtractFloat(%s, '%s'))) AS _time_second_, 
  fromUnixTimestamp64Nano(toInt64(JSONExtractFloat(%s, '%s')*1000000000)) AS _time_nanosecond_`
	databendNanoSecondTimeParse = databendFloatTimeParseV3
)

var typArr = []string{
	"Array(String)",
	"DateTime64",
	"DateTime",
	"String",
	"Int64",
	"Float64",
	"JSON",
	"UInt64",
	"UInt8",
	"UInt16",
	"UInt32",
	"UInt128",
	"UInt256",
	"Int8",
	"Int16",
	"Int32",
	"Int128",
	"Int256",
	"Float32",
}

var typKey = map[string]int{
	"Array(String)": -3,
	"DateTime64":    -2,
	"DateTime":      -1,
	"String":        0,
	"Int64":         1,
	"Float64":       2,
	"JSON":          3,
	"UInt64":        4,
	"UInt8":         5,
	"UInt16":        6,
	"UInt32":        7,
	"UInt128":       8,
	"UInt256":       9,
	"Int8":          10,
	"Int16":         11,
	"Int32":         12,
	"Int128":        13,
	"Int256":        14,
	"Float32":       15,
}

var typORM = map[int]string{
	-3: "Array(String)",
	-2: "DateTime64",
	-1: "DateTime",
	0:  "String",
	1:  "Int64",
	2:  "Float64",
	3:  "JSON",
	4:  "UInt64",
	5:  "UInt8",
	6:  "UInt16",
	7:  "UInt32",
	8:  "UInt128",
	9:  "UInt256",
	10: "Int8",
	11: "Int16",
	12: "Int32",
	13: "Int128",
	14: "Int256",
	15: "Float32",
}

var jsonExtractORM = map[int]string{
	0: "toString",
	1: "toInt64OrNull",
	2: "toFloat64OrNull",
}
