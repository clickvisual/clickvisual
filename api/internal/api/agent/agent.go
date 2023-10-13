package agent

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type Agent struct {
	client *cvdocker.Component
}

// NewAgent 是部署在k8s上，所以需要检测是哪种k8s部署方式
func NewAgent() *Agent {
	return &Agent{
		client: cvdocker.NewContainer(),
	}
}

type SearchRequest struct {
	StartTime int64
	EndTime   int64
	Date      string   // last 30min,6h,1d,7d
	KeyWord   string   // 搜索的关键词
	Limit     int64    // 最少多少条数据
	Container []string // container信息
}

func (a *Agent) Search(c *core.Context) {
	postReq := &SearchRequest{}
	err := c.Bind(postReq)
	if err != nil {
		c.JSONE(1, "can not bind request", err)
		return
	}
	req := search.Request{
		StartTime:    postReq.StartTime,
		EndTime:      postReq.EndTime,
		Date:         postReq.Date,
		KeyWord:      postReq.KeyWord,
		Limit:        postReq.Limit,
		K8SContainer: postReq.Container,
	}
	if req.KeyWord == "*" {
		req.KeyWord = ""
	}
	resp := view.RespQuery{}
	searchResp, err := search.Run(req)
	if err != nil {
		panic(err)
	}
	resp.Logs = searchResp.Logs
	resp.Limited = uint32(postReq.Limit)
	resp.Count = uint64(len(resp.Logs))
	resp.Keys = make([]*db2.BaseIndex, 0)
	resp.ShowKeys = make([]string, 0)
	resp.HiddenFields = make([]string, 0)
	resp.DefaultFields = make([]string, 0)
	resp.Terms = make([][]string, 0)
	c.JSONOK(resp)
}
