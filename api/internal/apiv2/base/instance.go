package base

import (
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

func InstanceList(c *core.Context, subResource string) {
	res, err := service.InstanceFilterPms(c.Uid(), subResource)
	if err != nil {
		c.JSONE(core.CodeErr, err.Error(), nil)
		return
	}
	c.JSONE(core.CodeOK, "succ", res)
	return
}
