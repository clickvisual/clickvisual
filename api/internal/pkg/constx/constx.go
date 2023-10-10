package constx

const (
	TableCreateTypeExist              int = 1
	TableCreateTypeJSONEachRow        int = 2
	TableCreateTypeJSONAsString       int = 6
	TableCreateTypeTraceCalculation   int = 4
	TableCreateTypeBufferNullDataPipe int = 5

	// Deprecated: TableCreateTypeCV
	TableCreateTypeCV int = 0
	// Deprecated: TableCreateTypeUBW
	TableCreateTypeUBW int = 3
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
