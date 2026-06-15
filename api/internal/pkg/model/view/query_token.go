package view

type ReqQueryTokenCreate struct {
	Name     string `json:"name" form:"name"`
	Desc     string `json:"desc" form:"desc"`
	ExpireAt int64  `json:"expireAt" form:"expireAt"`
	TableIDs []int  `json:"tableIds" form:"tableIds"`
}

type ReqQueryTokenUpdate struct {
	Name     string `json:"name" form:"name"`
	Desc     string `json:"desc" form:"desc"`
	Status   int    `json:"status" form:"status"`
	ExpireAt int64  `json:"expireAt" form:"expireAt"`
}

type ReqQueryTokenGrantUpdate struct {
	TableIDs []int `json:"tableIds" form:"tableIds"`
}

type ReqQueryTokenAuditList struct {
	TokenID  int `json:"tokenId" form:"tokenId"`
	Current  int `json:"current" form:"current"`
	PageSize int `json:"pageSize" form:"pageSize"`
}

type RespQueryToken struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Token       string `json:"token,omitempty"`
	TokenPrefix string `json:"tokenPrefix"`
	Status      int    `json:"status"`
	ExpireAt    int64  `json:"expireAt"`
	LastUsedAt  int64  `json:"lastUsedAt"`
	CreatedBy   int    `json:"createdBy"`
	Desc        string `json:"desc"`
	Ctime       int64  `json:"ctime"`
	Utime       int64  `json:"utime"`
	TableIDs    []int  `json:"tableIds"`
}

type RespQueryTokenAudit struct {
	ID           int    `json:"id"`
	TokenID      int    `json:"tokenId"`
	TokenName    string `json:"tokenName"`
	Tid          int    `json:"tid"`
	DatabaseName string `json:"databaseName"`
	TableName    string `json:"tableName"`
	QueryJSON    string `json:"queryJson"`
	ST           int64  `json:"st"`
	ET           int64  `json:"et"`
	Page         uint32 `json:"page"`
	PageSize     uint32 `json:"pageSize"`
	ResultCount  uint64 `json:"resultCount"`
	CostMs       int64  `json:"costMs"`
	Status       string `json:"status"`
	ErrorMessage string `json:"errorMessage"`
	ClientIP     string `json:"clientIp"`
	UserAgent    string `json:"userAgent"`
	Ctime        int64  `json:"ctime"`
}
