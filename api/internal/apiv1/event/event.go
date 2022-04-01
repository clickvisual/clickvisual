package event

import (
	"strings"

	"github.com/shimohq/mogo/api/internal/service/event"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func GetAllEnums(c *core.Context) {
	c.JSONOK(event.Event.GetAllEnums())
}

func GetEnumsOfSource(c *core.Context) {
	tgtSrc := strings.TrimSpace(c.Param("name"))
	if tgtSrc == "" {
		c.JSONE(1, "target source cannot be empty", nil)
		return
	}

	resp, err := event.Event.GetEnumsOfSource(tgtSrc)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}

	c.JSONOK(resp)
}

func ListPage(c *core.Context) {
	var req view.ReqEventList

	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "请求参数错误. "+err.Error(), nil)
		return
	}

	eventList, page, err := event.Event.List(req)
	if err != nil {
		c.JSONE(1, "list events error. "+err.Error(), nil)
		return
	}

	c.JSONOK(map[string]interface{}{
		"pagination": page,
		"list":       eventList,
	})

}
