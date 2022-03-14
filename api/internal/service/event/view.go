package event

type (
	UserIdName struct {
		Uid      int
		Username string
	}
	RespAllEnums struct {
		SourceEnums    map[string]string `json:"sourceEnums"`
		OperationEnums map[string]string `json:"operationEnums"`
		UserEnums      map[int]string    `json:"userEnums"`
	}

	RespEnumsOfSource struct {
		TargetSource   string            `json:"targetSource"`
		OperationEnums map[string]string `json:"operationEnums"`
	}
)
