// @BeeOverwrite YES
// @BeeGenerateTime 20200820_195417
package db

import (
	"log"
	"strings"
	"time"

	"github.com/spf13/cast"
	"gorm.io/gorm"
)

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
		cond := assertCond(cond)

		switch strings.ToLower(cond.Op) {
		case "like":
			if cond.Val != "" {
				sql += " AND `" + field + "` like ?"
				cond.Val = "%" + cond.Val.(string) + "%"
			}
		case "%like":
			if cond.Val != "" {
				sql += " AND `" + field + "` like ?"
				cond.Val = "%" + cond.Val.(string)
			}
		case "like%":
			if cond.Val != "" {
				sql += " AND `" + field + "` like ?"
				cond.Val = cond.Val.(string) + "%"
			}
		case "in", "not in":
			sql += " AND `" + field + "` " + cond.Op + " (?) "
		case "between":
			sql += " AND `" + field + "` " + cond.Op + " ? AND ?"
			val := cast.ToStringSlice(cond.Val)
			binds = append(binds, val[0], val[1])
			continue
		case "exp":
			sql += " AND `" + field + "` ? "
			cond.Val = gorm.Expr(cond.Val.(string))
		default:
			sql += " AND `" + field + "` " + cond.Op + " ? "
		}
		binds = append(binds, cond.Val)
	}
	return
}

func BuildPreloadArgs(conds Conds) (args []interface{}) {
	var sqlItems = make([]string, 0)
	var binds = make([]interface{}, 0, len(conds))
	for field, cond := range conds {
		cond := assertCond(cond)

		switch strings.ToLower(cond.Op) {
		case "like":
			if cond.Val != "" {
				sqlItems = append(sqlItems, "`"+field+"` like ?")
				cond.Val = "%" + cond.Val.(string) + "%"
			}
		case "%like":
			if cond.Val != "" {
				sqlItems = append(sqlItems, "`"+field+"` like ?")
				cond.Val = "%" + cond.Val.(string)
			}
		case "like%":
			if cond.Val != "" {
				sqlItems = append(sqlItems, "`"+field+"` like ?")
				cond.Val = cond.Val.(string) + "%"
			}
		case "in", "not in":
			sqlItems = append(sqlItems, "`"+field+"` "+cond.Op+" (?) ")
		case "between":
			sqlItems = append(sqlItems, "`"+field+"` "+cond.Op+" ? AND ?")
			val := cast.ToStringSlice(cond.Val)
			binds = append(binds, val[0], val[1])
			continue
		case "exp":
			sqlItems = append(sqlItems, "`"+field+"` ? ")
			cond.Val = gorm.Expr(cond.Val.(string))
		default:
			sqlItems = append(sqlItems, "`"+field+"` "+cond.Op+" ? ")
		}
		binds = append(binds, cond.Val)
	}
	sql := strings.Join(sqlItems, " AND ")
	if sql == "" {
		return
	}
	args = append(args, sql)
	args = append(args, binds...)
	return
}
