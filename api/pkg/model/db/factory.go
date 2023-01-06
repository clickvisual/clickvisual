package db

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/spf13/cast"
	"gorm.io/gorm"
	sdelete "gorm.io/plugin/soft_delete"
)

const (
	// ReplicaStatusYes This definition is really outrageous
	ReplicaStatusYes = 0
	ReplicaStatusNo  = 1
)

type iModel interface {
	TableName() string
}

const (
	TableNameUser         = "cv_user"
	TableNameEvent        = "cv_event"
	TableNameK8SConfigMap = "cv_k8s_cm"
	TableNameCluster      = "cv_cluster"
	TableNameCollect      = "cv_collect"

	TableNameBaseView        = "cv_base_view"
	TableNameBaseTable       = "cv_base_table"
	TableNameBaseTableAttach = "cv_base_table_attach"
	TableNameBaseIndex       = "cv_base_index"
	TableNameBaseDatabase    = "cv_base_database"
	TableNameBaseInstance    = "cv_base_instance"
	TableNameBaseShortURL    = "cv_base_short_url"
	TableNameBaseHiddenField = "cv_base_hidden_field"

	TableNameAlarm          = "cv_alarm"
	TableNameAlarmFilter    = "cv_alarm_filter"
	TableNameAlarmHistory   = "cv_alarm_history"
	TableNameAlarmChannel   = "cv_alarm_channel"
	TableNameAlarmCondition = "cv_alarm_condition"

	TableNameConfiguration        = "cv_configuration"
	TableNameConfigurationHistory = "cv_configuration_history"
	TableNameConfigurationPublish = "cv_configuration_publish"

	TableNamePmsRole         = "cv_pms_role"
	TableNamePmsRoleRef      = "cv_pms_role_ref"
	TableNamePmsRoleDetail   = "cv_pms_role_detail"
	TableNamePmsRoleRefGrant = "cv_pms_role_ref_grant"
	TableNamePmsCasbinRule   = "cv_pms_casbin_rule"
	TableNamePmsCustomRole   = "cv_pms_custom_role"
	TableNamePmsDefaultRole  = "cv_pms_default_role"

	TableNameBigDataNode        = "cv_bd_node"
	TableNameBigDataNodeResult  = "cv_bd_node_result"
	TableNameBigDataNodeContent = "cv_bd_node_content"
	TableNameBigDataNodeHistory = "cv_bd_node_history"
	TableNameBigDataFolder      = "cv_bd_folder"
	TableNameBigDataSource      = "cv_bd_source"
	TableNameBigDataWorkflow    = "cv_bd_workflow"
	TableNameBigDataDepend      = "cv_bd_depend"
	TableNameBigDataCrontab     = "cv_bd_crontab"
)

type BaseModel struct {
	ID    int               `gorm:"not null;primary_key;AUTO_INCREMENT;comment:自增id" json:"id"`
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

type Strings []string

func (t Strings) Value() (driver.Value, error) {
	b, err := json.Marshal(t)
	return string(b), err
}

func (t *Strings) Scan(input interface{}) error {
	in := input.([]byte)
	if len(in) == 0 {
		in = []byte("[]")
	}
	return json.Unmarshal(in, t)
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

type (
	// Cond 为字段查询结构体
	Cond struct {
		// Op MySQL中查询条件，如like,=,in
		Op string
		// Val 查询条件对应的值
		Val interface{}
	}

	// Conds 为Cond类型map，用于定义Where方法参数 map[field.name]interface{}
	Conds map[string]interface{}

	// Ups 为更新某一条记录时存放的变更数据集合 map[field.name]field.value
	Ups = map[string]interface{}
)

// assertCond 断言cond基本类型并返回Cond
// 如果是基本类型，则Cond.Op为"="
// 如果是切片类型，则Cond.Op为"in"。NOTICE: 不支持自定义类型切片，比如 type IDs []int
func assertCond(cond interface{}) Cond {
	// 先尝试断言为基本类型
	switch v := cond.(type) {
	case Cond:
		return v
	case string:
		return Cond{"=", v}
	case bool:
		return Cond{"=", v}
	case float64:
		return Cond{"=", v}
	case float32:
		return Cond{"=", v}
	case int:
		return Cond{"=", v}
	case int64:
		return Cond{"=", v}
	case int32:
		return Cond{"=", v}
	case int16:
		return Cond{"=", v}
	case int8:
		return Cond{"=", v}
	case uint:
		return Cond{"=", v}
	case uint64:
		return Cond{"=", v}
	case uint32:
		return Cond{"=", v}
	case uint16:
		return Cond{"=", v}
	case uint8:
		return Cond{"=", v}
	case time.Duration:
		return Cond{"=", v}
	}

	// 再尝试断言为slice类型
	condValueStr, e := cast.ToStringSliceE(cond)
	if e == nil {
		return Cond{"in", condValueStr}
	}

	// 再尝试断言为slice类型
	condValueInt, e := cast.ToIntSliceE(cond)
	if e == nil {
		return Cond{"in", condValueInt}
	}

	// 未识别的类型
	log.Printf("[assertCond] unrecognized type fail,%+v\n", cond)
	return Cond{}
}

// BuildQuery 根据conds构建sql和绑定的参数
func BuildQuery(conds Conds) (sql string, binds []interface{}) {
	sql = "1=1"
	binds = make([]interface{}, 0, len(conds))
	for field, cond := range conds {
		cd := assertCond(cond)

		switch strings.ToLower(cd.Op) {
		case "like":
			if cd.Val != "" {
				sql += " AND `" + field + "` like ?"
				cd.Val = "%" + cd.Val.(string) + "%"
			}
		case "%like":
			if cd.Val != "" {
				sql += " AND `" + field + "` like ?"
				cd.Val = "%" + cd.Val.(string)
			}
		case "like%":
			if cd.Val != "" {
				sql += " AND `" + field + "` like ?"
				cd.Val = cd.Val.(string) + "%"
			}
		case "in", "not in":
			sql += " AND `" + field + "` " + cd.Op + " (?) "
		case "between":
			sql += " AND `" + field + "` " + cd.Op + " ? AND ?"
			val := cast.ToStringSlice(cd.Val)
			binds = append(binds, val[0], val[1])
			continue
		case "exp":
			sql += " AND `" + field + "` ? "
			cd.Val = gorm.Expr(cd.Val.(string))
		default:
			sql += " AND `" + field + "` " + cd.Op + " ? "
		}
		binds = append(binds, cd.Val)
	}
	return
}

func BuildPreloadArgs(conds Conds) (args []interface{}) {
	var sqlItems = make([]string, 0)
	var binds = make([]interface{}, 0, len(conds))
	for field, cond := range conds {
		cd := assertCond(cond)

		switch strings.ToLower(cd.Op) {
		case "like":
			if cd.Val != "" {
				sqlItems = append(sqlItems, "`"+field+"` like ?")
				cd.Val = "%" + cd.Val.(string) + "%"
			}
		case "%like":
			if cd.Val != "" {
				sqlItems = append(sqlItems, "`"+field+"` like ?")
				cd.Val = "%" + cd.Val.(string)
			}
		case "like%":
			if cd.Val != "" {
				sqlItems = append(sqlItems, "`"+field+"` like ?")
				cd.Val = cd.Val.(string) + "%"
			}
		case "in", "not in":
			sqlItems = append(sqlItems, "`"+field+"` "+cd.Op+" (?) ")
		case "between":
			sqlItems = append(sqlItems, "`"+field+"` "+cd.Op+" ? AND ?")
			val := cast.ToStringSlice(cd.Val)
			binds = append(binds, val[0], val[1])
			continue
		case "exp":
			sqlItems = append(sqlItems, "`"+field+"` ? ")
			cd.Val = gorm.Expr(cd.Val.(string))
		default:
			sqlItems = append(sqlItems, "`"+field+"` "+cd.Op+" ? ")
		}
		binds = append(binds, cd.Val)
	}
	sql := strings.Join(sqlItems, " AND ")
	if sql == "" {
		return
	}
	args = append(args, sql)
	args = append(args, binds...)
	return
}

type Pagination struct {
	// Current 总记录数
	Current int `json:"current" form:"current"`
	// PageSize 每页记录数
	PageSize int `json:"pageSize" form:"pageSize"`
	// Total 总页数
	Total int64 `json:"total" form:"total"`
	// Sort 顺序
	Sort string `json:"sort"  form:"sort"`
}
