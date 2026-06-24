package query

import (
	"strconv"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/event"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/permission/pmsplugin"
	"github.com/clickvisual/clickvisual/api/internal/service/querypublish"
)

// PublishDraft godoc
// @Summary      生成接入发布草案
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/ingestion/publish-draft [post]
func PublishDraft(c *core.Context) {
	var req view.PublishDraftRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := querypublish.BuildPublishDraft(req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

// Publish godoc
// @Summary      创建接入发布配置
// @Tags         QUERY
// @Accept       json
// @Produce      json
// @Router       /api/v2/query/ingestion/publish [post]
func Publish(c *core.Context) {
	var req view.PublishRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := permission.Manager.CheckNormalPermission(view.ReqPermission{
		UserId:      c.Uid(),
		ObjectType:  pmsplugin.PrefixInstance,
		ObjectIdx:   strconv.Itoa(req.Target.InstanceId),
		SubResource: pmsplugin.Log,
		Acts:        []string{pmsplugin.ActEdit},
	}); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	resp, err := querypublish.Publish(c.Uid(), req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	if event.Event != nil {
		event.Event.InquiryCMDB(c.User(), db.OpnTableCreateSelfBuilt, map[string]interface{}{"publish": req, "result": resp})
	}
	c.JSONOK(resp)
}
