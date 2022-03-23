package core

import (
	"fmt"
	"net/http"

	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/core/etrace"
	"github.com/shimohq/mogo/api/internal/invoker"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

// HandlerFunc defines the handler to wrap gin.Context
type HandlerFunc func(c *Context)

// Handle convert HandlerFunc to gin.HandlerFunc
func Handle(h HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := &Context{
			c,
		}
		h(ctx)
	}
}

// Context a wrapper of gin.Context
type Context struct {
	*gin.Context
}

const (
	// CodeOK means a successful response
	CodeOK = 0
	// CodeErr means a failure response
	CodeErr = 1
	// DefaultPaginationSize defines pagination size of an item list response
	DefaultPaginationSize = 20
)

// Res defines HTTP JSON response
type Res struct {
	// Code means response business code
	Code int `json:"code"`
	// Msg means response extra message
	Msg string `json:"msg"`
	// Data means response data payload
	Data interface{} `json:"data"`
}

// ResPage defines HTTP JSON response with extra pagination data
type ResPage struct {
	Res
	Pagination Pagination `json:"pagination"`
}

type Pagination struct {
	// Current means current page number
	Current int `json:"current" form:"current"`
	// PageSize means max item count of a page
	PageSize int `json:"pageSize" form:"pageSize"`
	// Total means total page count
	Total int64 `json:"total" form:"total"`
	// Sort means sort expression
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

// JSON returns JSON response
// e.x. {"code":<code>, "msg":<msg>, "data":<data>}
func (c *Context) JSON(httpStatus int, res Res) {
	c.Context.JSON(httpStatus, res)
}

// JSONOK returns JSON response with successful business code and data
// e.x. {"code":0, "msg":"成功", "data":<data>}
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

// JSONE returns JSON response with failure business code ,msg and data
// e.x. {"code":<code>, "msg":<msg>, "data":<data>}
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
	invoker.Logger.Warn("biz warning", elog.FieldValue(msg), elog.FieldValueAny(data), elog.FieldTid(etrace.ExtractTraceID(c.Request.Context())))
	c.Context.JSON(http.StatusOK, j)
	return
}

// JSONPage returns JSON response with pagination
// e.x. {"code":<code>, "msg":<msg>, "data":<data>, "pagination":<pagination>}
// <pagination> { "current":1, "pageSize":20, "total": 9 }
func (c *Context) JSONPage(data interface{}, pagination Pagination) {
	j := new(ResPage)
	j.Code = CodeOK
	j.Data = data
	j.Pagination = pagination
	c.Context.JSON(http.StatusOK, j)
}

// Bind wraps gin context.Bind() with custom validator
func (c *Context) Bind(obj interface{}) (err error) {
	return validate(c.Context.Bind(obj))
}

// ShouldBind wraps gin context.ShouldBind() with custom validator
func (c *Context) ShouldBind(obj interface{}) (err error) {
	return validate(c.Context.ShouldBind(obj))
}
