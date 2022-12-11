package constx

const (
	TableCreateTypeCV int = iota
	TableCreateTypeExist
	TableCreateTypeJSONEachRow
	TableCreateTypeUBW
	TableCreateTypeTraceCalculation
	TableCreateTypeBufferNullDataPipe
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
