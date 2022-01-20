package core

import (
	"fmt"
	"net/http"

	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/core/etrace"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

// HandlerFunc core封装后的handler
type HandlerFunc func(c *Context)

// Handle 将core.HandlerFunc转换为gin.HandlerFunc
func Handle(h HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := &Context{
			c,
		}
		h(ctx)
	}
}

// Context core封装后的Context
type Context struct {
	*gin.Context
}

const (
	// CodeOK 表示响应成功状态码
	CodeOK = 0
	// CodeErr 表示默认响应失败状态码
	CodeErr = 1
	// DefaultPaginationSize ...
	DefaultPaginationSize = 20
)

// Res 标准JSON输出格式
type Res struct {
	// Code 响应的业务错误码。0表示业务执行成功，非0表示业务执行失败。
	Code int `json:"code"`
	// Msg 响应的参考消息。前端可使用msg来做提示
	Msg string `json:"msg"`
	// Data 响应的具体数据
	Data interface{} `json:"data"`
}

// ResPage 带分页的标准JSON输出格式
type ResPage struct {
	Res
	Pagination Pagination `json:"pagination"`
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

func (p *Pagination) Valid() error {
	if p.Current == 0 {
		p.Current = 1
	}
	if p.PageSize == 0 {
		p.PageSize = DefaultPaginationSize
	}

	if p.Current < 0 {
		return fmt.Errorf("current MUST be larger than 0")
	}

	if p.PageSize < 0 {
		return fmt.Errorf("invalid pageSize")
	}
	return nil
}

func (p *Pagination) List(db *gorm.DB, list interface{}) {
	if p.PageSize == 0 {
		p.PageSize = DefaultPaginationSize
	}
	if p.Current == 0 {
		p.Current = 1
	}
	if p.Sort == "" {
		p.Sort = "id desc"
	}
	db.Count(&p.Total)
	db.Order(p.Sort).Offset((p.Current - 1) * p.PageSize).Limit(p.PageSize).Find(list)
	return
}

// JSON 输出响应JSON
// 形如 {"code":<code>, "msg":<msg>, "data":<data>}
func (c *Context) JSON(httpStatus int, res Res) {
	c.Context.JSON(httpStatus, res)
}

// JSONOK 输出响应成功JSON，如果data不为零值，则输出data
// 形如 {"code":0, "msg":"成功", "data":<data>}
func (c *Context) JSONOK(data ...interface{}) {
	j := new(Res)
	j.Code = CodeOK
	j.Msg = "succ"
	if len(data) > 0 {
		j.Data = data[0]
	} else {
		j.Data = ""
	}
	c.Context.JSON(http.StatusOK, j)
	return
}

// JSONE 输出失败响应
// 形如 {"code":<code>, "msg":<msg>, "data":<data>}
func (c *Context) JSONE(code int, msg string, data interface{}) {
	j := new(Res)
	j.Code = code
	j.Msg = msg
	switch d := data.(type) {
	case error:
		j.Data = d.Error()
	default:
		j.Data = data
	}
	elog.Warn("biz warning", elog.FieldValue(msg), elog.FieldValueAny(data), elog.FieldTid(etrace.ExtractTraceID(c.Request.Context())))
	c.Context.JSON(http.StatusOK, j)
	return
}

// JSONPage 输出带分页信息的JSON
// 形如 {"code":<code>, "msg":<msg>, "data":<data>, "pagination":<pagination>}
// <pagination> { "current":1, "pageSize":20, "total": 9 }
func (c *Context) JSONPage(data interface{}, pagination Pagination) {
	j := new(ResPage)
	j.Code = CodeOK
	j.Data = data
	j.Pagination = pagination
	c.Context.JSON(http.StatusOK, j)
}

// Bind 将请求消息绑定到指定对象中，并做数据校验。如果校验失败，则返回校验失败错误中文文案
// 并将HTTP状态码设置成400
func (c *Context) Bind(obj interface{}) (err error) {
	return validate(c.Context.Bind(obj))
}

// ShouldBind 将请求消息绑定到指定对象中，并做数据校验。如果校验失败，则返回校验失败错误中文文案
// 类似Bind，但是不会将HTTP状态码设置成400
func (c *Context) ShouldBind(obj interface{}) (err error) {
	return validate(c.Context.ShouldBind(obj))
}
