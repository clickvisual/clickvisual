package constx

const (
	TableCreateTypeCV      = 0
	TableCreateTypeExist   = 1
	TableCreateTypeAnyJSON = 2
	TableCreateTypeUBW     = 3
)

const (
	UBWKafkaStreamField = "body"
)

var (
	DefaultFields = map[string]interface{}{
		"_time_nanosecond_": struct{}{},
		"_time_second_":     struct{}{},
		"_raw_log_":         struct{}{},
		"_key":              struct{}{},
	}
)
