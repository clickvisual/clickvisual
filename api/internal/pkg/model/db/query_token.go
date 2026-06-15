package db

const (
	QueryTokenStatusEnabled  = 1
	QueryTokenStatusDisabled = 2
)

type QueryToken struct {
	BaseModel

	Name        string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
	TokenHash   string `gorm:"column:token_hash;type:varchar(64);NOT NULL;uniqueIndex:idx_query_token_hash" json:"-"`
	TokenPrefix string `gorm:"column:token_prefix;type:varchar(32);NOT NULL;index:idx_query_token_prefix" json:"tokenPrefix"`
	Status      int    `gorm:"column:status;type:tinyint(1);default:1;NOT NULL;index:idx_query_token_status" json:"status"`
	ExpireAt    int64  `gorm:"column:expire_at;type:bigint;default:0;NOT NULL" json:"expireAt"`
	LastUsedAt  int64  `gorm:"column:last_used_at;type:bigint;default:0;NOT NULL" json:"lastUsedAt"`
	CreatedBy   int    `gorm:"column:created_by;type:int(11);default:0;NOT NULL;index:idx_query_token_created_by" json:"createdBy"`
	Desc        string `gorm:"column:desc;type:varchar(255)" json:"desc"`
}

func (*QueryToken) TableName() string {
	return TableNameQueryToken
}

type QueryTokenGrant struct {
	BaseModel

	TokenID int `gorm:"column:token_id;type:int(11);NOT NULL;uniqueIndex:idx_query_token_grant" json:"tokenId"`
	Tid     int `gorm:"column:tid;type:int(11);NOT NULL;uniqueIndex:idx_query_token_grant;index:idx_query_token_grant_tid" json:"tid"`
}

func (*QueryTokenGrant) TableName() string {
	return TableNameQueryTokenGrant
}

type QueryTokenAudit struct {
	BaseModel

	TokenID      int    `gorm:"column:token_id;type:int(11);NOT NULL;index:idx_query_token_audit_token" json:"tokenId"`
	TokenName    string `gorm:"column:token_name;type:varchar(128);NOT NULL" json:"tokenName"`
	Tid          int    `gorm:"column:tid;type:int(11);NOT NULL;index:idx_query_token_audit_tid" json:"tid"`
	DatabaseName string `gorm:"column:database_name;type:varchar(255);NOT NULL" json:"databaseName"`
	TableNameRef string `gorm:"column:table_name;type:varchar(255);NOT NULL" json:"tableName"`
	QueryJSON    string `gorm:"column:query_json;type:text" json:"queryJson"`
	ST           int64  `gorm:"column:st;type:bigint;default:0;NOT NULL" json:"st"`
	ET           int64  `gorm:"column:et;type:bigint;default:0;NOT NULL" json:"et"`
	Page         uint32 `gorm:"column:page;type:int(11);default:0;NOT NULL" json:"page"`
	PageSize     uint32 `gorm:"column:page_size;type:int(11);default:0;NOT NULL" json:"pageSize"`
	ResultCount  uint64 `gorm:"column:result_count;type:bigint unsigned;default:0;NOT NULL" json:"resultCount"`
	CostMs       int64  `gorm:"column:cost_ms;type:bigint;default:0;NOT NULL" json:"costMs"`
	Status       string `gorm:"column:status;type:varchar(32);NOT NULL;index:idx_query_token_audit_status" json:"status"`
	ErrorMessage string `gorm:"column:error_message;type:text" json:"errorMessage"`
	ClientIP     string `gorm:"column:client_ip;type:varchar(64)" json:"clientIp"`
	UserAgent    string `gorm:"column:user_agent;type:varchar(255)" json:"userAgent"`
}

func (*QueryTokenAudit) TableName() string {
	return TableNameQueryTokenAudit
}
