package view

type QueryFilterCondition struct {
	ID        string      `json:"id" form:"id"`
	Field     string      `json:"field" form:"field"`
	Operator  string      `json:"operator" form:"operator"`
	Value     interface{} `json:"value" form:"value"`
	ValueType string      `json:"valueType" form:"valueType"`
}

type QueryFilterTimeRange struct {
	StartTime string `json:"startTime" form:"startTime"`
	EndTime   string `json:"endTime" form:"endTime"`
}

type ReqQueryFilterUpsert struct {
	Name         string                 `json:"name" form:"name"`
	InstanceID   int                    `json:"instanceId" form:"instanceId"`
	InstanceName string                 `json:"instanceName" form:"instanceName"`
	Database     string                 `json:"database" form:"database"`
	Table        string                 `json:"table" form:"table"`
	TimeRange    QueryFilterTimeRange   `json:"timeRange" form:"timeRange"`
	Conditions   []QueryFilterCondition `json:"conditions" form:"conditions"`
}

type ReqQueryFilterList struct {
	InstanceID int    `json:"instanceId" form:"instanceId"`
	Database   string `json:"database" form:"database"`
	Table      string `json:"table" form:"table"`
}

type RespQueryFilterProfile struct {
	ID           int                    `json:"id"`
	Name         string                 `json:"name"`
	InstanceID   int                    `json:"instanceId"`
	InstanceName string                 `json:"instanceName"`
	Database     string                 `json:"database"`
	Table        string                 `json:"table"`
	TimeRange    QueryFilterTimeRange   `json:"timeRange"`
	Conditions   []QueryFilterCondition `json:"conditions"`
	Creator      string                 `json:"creator"`
	Updater      string                 `json:"updater"`
	Ctime        int64                  `json:"ctime"`
	Utime        int64                  `json:"utime"`
}

type RespQueryFilterDeleteResult struct {
	ID int `json:"id"`
}
