package db

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	sdelete "gorm.io/plugin/soft_delete"
)

const (
	TableNameView     = "mogo_base_view"
	TableNameTable    = "mogo_base_table"
	TableNameIndex    = "mogo_base_index"
	TableNameDatabase = "mogo_base_database"
	TableNameInstance = "mogo_base_instance"

	TableNameUser = "mogo_user"

	TableNameCluster = "mogo_cluster"

	TableNameConfiguration        = "mogo_configuration"
	TableNameConfigurationHistory = "mogo_configuration_history"
	TableNameConfigurationPublish = "mogo_configuration_publish"

	TableNameK8SConfigMap = "mogo_k8s_cm"

	TableMogoAlarm          = "mogo_alarm"
	TableMogoAlarmFilter    = "mogo_alarm_filter"
	TableMogoAlarmCondition = "mogo_alarm_condition"
	TableMogoAlarmHistory   = "mogo_alarm_history"
	TableMogoAlarmChannel   = "mogo_alarm_channel"

	TableMogoEvent = "mogo_event"
)

type BaseModel struct {
	ID    int               `gorm:"not null;primary_key;AUTO_INCREMENT" json:"id"` // 主键
	Ctime int64             `gorm:"bigint;autoCreateTime;comment:创建时间" json:"ctime"`
	Utime int64             `gorm:"bigint;autoUpdateTime;comment:更新时间" json:"utime"`
	Dtime sdelete.DeletedAt `gorm:"bigint;comment:删除时间" json:"dtime"`
}

type ReqPage struct {
	Current  int `json:"current" form:"current"`
	PageSize int `json:"pageSize" form:"pageSize"`
}

func (r *ReqPage) Valid() error {
	if r.Current == 0 {
		r.Current = 1
	}
	if r.PageSize == 0 {
		r.PageSize = 10
	}
	if r.Current < 0 {
		return fmt.Errorf("current MUST be larger than 0")
	}
	if r.PageSize < 0 {
		return fmt.Errorf("invalid pageSize")
	}
	return nil
}

type String2String map[string]string

func (t String2String) Value() (driver.Value, error) {
	b, err := json.Marshal(t)
	return string(b), err
}

func (t *String2String) Scan(input interface{}) error {
	return json.Unmarshal(input.([]byte), t)
}

type Ints []int

func (t Ints) Value() (driver.Value, error) {
	b, err := json.Marshal(t)
	return string(b), err
}

func (t *Ints) Scan(input interface{}) error {
	if len(input.([]byte)) == 0 {
		return json.Unmarshal([]byte("[]"), t)
	}
	if err := json.Unmarshal(input.([]byte), t); err != nil {
		return json.Unmarshal([]byte("[]"), t)
	}
	return json.Unmarshal(input.([]byte), t)
}

// abbr.  ->  fullName
// "Opn"  ->  "Operation"
// "mgt"  ->  "management"
const (
	// Operations of SourceUserMgtCenter
	OpnLocalUserCreate    = "local_user_create"
	OpnLocalUserDelete    = "local_user_delete"
	OpnLocalUserUpdate    = "local_user_update"
	OpnLocalUserPwdChange = "local_user_pwd_change"
	OpnLocalUserPwdReset  = "local_user_pwd_reset"

	OpnLogTableDelete = "log_table_delete"
)

var OperationMap = map[string]string{
	OpnLocalUserCreate:    "本地用户新增",
	OpnLocalUserDelete:    "本地用户删除",
	OpnLocalUserUpdate:    "本地用户更新",
	OpnLocalUserPwdChange: "本地用户密码更改",
	OpnLocalUserPwdReset:  "本地用户密码重制",
	OpnLogTableDelete:     "数据表删除",
}

const (
	SourceLogMgtCenter  = "log_mgt"
	SourceUserMgtCenter = "user_mgt"
)

var (
	SourceMap = map[string]string{
		SourceLogMgtCenter:  "日志管理中心",
		SourceUserMgtCenter: "用户管理中心",
	}
	SourceOpnMap = map[string][]string{
		SourceLogMgtCenter: {OpnLogTableDelete},
		SourceUserMgtCenter: {OpnLocalUserCreate, OpnLocalUserDelete, OpnLocalUserUpdate,
			OpnLocalUserPwdChange, OpnLocalUserPwdReset},
	}
)
