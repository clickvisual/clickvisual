package query

import (
	"strings"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/queryfilter"
)

// List godoc
// @Summary      获取筛选器列表
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/filters [get]
func List(c *core.Context) {
	var req view.ReqQueryFilterList
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := queryfilter.List(req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Get godoc
// @Summary      获取筛选器详情
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/filters/{filter-id} [get]
func Get(c *core.Context) {
	filterID := cast.ToInt(c.Param("filter-id"))
	resp, err := queryfilter.Get(filterID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Create godoc
// @Summary      创建筛选器
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/filters [post]
func Create(c *core.Context) {
	var req view.ReqQueryFilterUpsert
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := queryfilter.Create(req, requestOperator(c))
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Update godoc
// @Summary      更新筛选器
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/filters/{filter-id} [put]
func Update(c *core.Context) {
	filterID := cast.ToInt(c.Param("filter-id"))
	var req view.ReqQueryFilterUpsert
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := queryfilter.Update(filterID, req, requestOperator(c))
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Delete godoc
// @Summary      删除筛选器
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/filters/{filter-id} [delete]
func Delete(c *core.Context) {
	filterID := cast.ToInt(c.Param("filter-id"))
	resp, err := queryfilter.Delete(filterID)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func requestOperator(c *core.Context) string {
	user := c.User()
	if user == nil {
		return "system"
	}
	name := strings.TrimSpace(user.Username)
	if name == "" {
		return "system"
	}
	return name
}
