package agent

import (
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
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
	StartTime int64    `json:"startTime" form:"startTime"`
	EndTime   int64    `json:"endTime" form:"endTime"`
	Date      string   `json:"date" form:"date"`           // last 30min,6h,1d,7d
	KeyWord   string   `json:"keyWord" form:"keyWord"`     // 搜索的关键词
	Limit     int64    `json:"limit" form:"limit"`         // 最少多少条数据
	Container []string `json:"container" form:"container"` // container信息
	IsK8s     int      `json:"isK8s" form:"isK8s"`         // 是否为k8s
	Dir       string   `json:"dir" form:"dir"`             // 文件夹路径
}

func (a *Agent) Search(c *core.Context) {
	postReq := &SearchRequest{}
	err := c.Bind(postReq)
	if err != nil {
		c.JSONE(1, "can not bind request", err)
		return
	}
	req := search.Request{
		StartTime: postReq.StartTime,
		EndTime:   postReq.EndTime,
		Limit:     postReq.Limit,
	}
	if postReq.Date != "" {
		req.Date = postReq.Date
	}
	if postReq.IsK8s == 1 {
		req.IsK8S = true
	}
	if len(postReq.Container) > 0 {
		req.K8SContainer = postReq.Container
	}
	if postReq.KeyWord != "*" && postReq.KeyWord != "" {
		for _, t := range search.Keyword2Array(postReq.KeyWord, false) {
			if t.Key == search.InnerKeyContainer {
				req.K8SContainer = append(req.K8SContainer, t.Value.(string))
			} else {
				req.KeyWord = postReq.KeyWord
			}
		}
		req.KeyWord = postReq.KeyWord
	}
	if postReq.Dir != "" {
		req.Dir = postReq.Dir
	}
	resp, err := search.Run(req)
	if err != nil {
		elog.Error("search error", l.E(err))
		c.JSONE(1, "search error", err)
		return
	}
	if len(resp.Data) > 50 {
		resp.Data = resp.Data[:50]
	}
	c.JSONOK(resp)
}
