package constx

const (
	TableCreateTypeCV                 int = 0
	TableCreateTypeExist              int = 1
	TableCreateTypeJSONEachRow        int = 2
	TableCreateTypeUBW                int = 3
	TableCreateTypeTraceCalculation   int = 4
	TableCreateTypeBufferNullDataPipe int = 5
	TableCreateTypeJSONAsString       int = 6
)

const (
	UBWKafkaStreamField = "body"
)

var (
	DefaultFields = map[string]interface{}{
		"_raw_log_":         struct{}{},
		"_time_second_":     struct{}{},
		"_time_nanosecond_": struct{}{},

		"_key":           struct{}{},
		"_headers.name":  struct{}{},
		"_headers.value": struct{}{},
	}
)
