package setting

import (
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cast"

	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"

	"github.com/shimohq/mogo/api/pkg/model/db"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func IndexUpdate(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	var (
		req    view.ReqCreateIndex
		addMap map[string]*db.Index
		delMap map[string]*db.Index
		newMap map[string]*db.Index
		err    error
	)
	if err = c.Bind(&req); err != nil {
		c.JSONE(1, "param error:"+err.Error(), nil)
		return
	}
	// check repeat
	repeatMap := make(map[string]interface{})
	for _, r := range req.Data {
		if r.Typ == 3 {
			c.JSONE(1, "param error: json type 3 should not in params:"+r.Field, nil)
			return
		}
		if _, ok := repeatMap[r.Field]; ok {
			c.JSONE(1, "param error: repeat index field name:"+r.Field, nil)
			return
		}
		repeatMap[r.Field] = struct{}{}
	}
	req.Tid = tid
	addMap, delMap, newMap, err = service.Index.Diff(req)
	if err != nil {
		c.JSONE(1, "unknown error:"+err.Error(), nil)
		return
	}

	elog.Debug("IndexUpdate", elog.Any("addMap", addMap), elog.Any("delMap", delMap))

	err = service.Index.Sync(req, addMap, delMap, newMap)
	if err != nil {
		c.JSONE(1, "unknown error:"+err.Error(), nil)
		return
	}
	c.JSONOK()
}

func Indexes(c *core.Context) {
	tid := cast.ToInt(c.Param("id"))
	if tid == 0 {
		c.JSONE(core.CodeErr, "invalid parameter", nil)
		return
	}
	conds := egorm.Conds{}
	conds["tid"] = tid
	indexes, err := db.IndexList(conds)
	if err != nil {
		c.JSONE(1, "unknown error: "+err.Error(), nil)
		return
	}
	c.JSONOK(indexes)
}
