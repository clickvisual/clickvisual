package constx

const (
	TableCreateTypeCV          = 0
	TableCreateTypeExist       = 1
	TableCreateTypeJSONEachRow = 2
	TableCreateTypeUBW         = 3
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
