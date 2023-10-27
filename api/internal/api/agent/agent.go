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
	StartTime int64    `json:"startTime,string" form:"startTime"`
	EndTime   int64    `json:"endTime,string" form:"endTime"`
	Date      string   `json:"date" form:"date"`           // last 30min,6h,1d,7d
	KeyWord   string   `json:"keyWord" form:"keyWord"`     // 搜索的关键词
	Limit     int64    `json:"limit,string" form:"limit"`  // 最少多少条数据
	Container []string `json:"container" form:"container"` // container信息
	IsK8s     int      `json:"isK8s,string" form:"isK8s"`  // 是否为k8s
	Dir       string   `json:"dir" form:"dir"`             // 文件夹路径
}

type ChartsSearchRequest struct {
	SearchRequest
	IsChartRequest bool  `json:"isChartRequest,string" form:"isChartRequest"`
	Interval       int64 `json:"interval,string" form:"interval"`
}

func (a *Agent) Search(c *core.Context) {
	postReq := &SearchRequest{}
	err := c.Bind(postReq)
	if err != nil {
		elog.Error("agent[node] can not bind request", l.E(err), l.A("request", c.Request))
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
			if search.TrimKeyWord(t.Key) == search.InnerKeyContainer {
				req.K8SContainer = append(req.K8SContainer, search.TrimKeyWord(t.Value.(string)))
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
	elog.Info("agent[node] client logs response", l.A("response", resp))
	if err != nil {
		elog.Error("agent[node] search error", l.E(err))
		c.JSONE(1, "search error", err)
		return
	}
	if len(resp.Data) > 50 {
		resp.Data = resp.Data[:50]
	}
	c.JSONOK(resp)
}

func (a *Agent) Charts(c *core.Context) {
	postReq := &ChartsSearchRequest{}
	err := c.Bind(postReq)
	if err != nil {
		elog.Error("agent[node] can not bind request", l.E(err), l.A("request", c.Request))
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
	elog.Info("agent[node] client charts request", l.A("request", postReq))
	if postReq.Interval < 0 || !postReq.IsChartRequest {
		c.JSONE(1, "only support request for charts, please check params...", nil)
		return
	}

	req.Interval = postReq.Interval
	req.IsChartRequest = postReq.IsChartRequest

	if postReq.KeyWord != "*" && postReq.KeyWord != "" {
		for _, t := range search.Keyword2Array(postReq.KeyWord, false) {
			if search.TrimKeyWord(t.Key) == search.InnerKeyContainer {
				req.K8SContainer = append(req.K8SContainer, search.TrimKeyWord(t.Value.(string)))
			} else {
				req.KeyWord = postReq.KeyWord
			}
		}
		req.KeyWord = postReq.KeyWord
	}
	if postReq.Dir != "" {
		req.Dir = postReq.Dir
	}
	resp, err := search.RunCharts(req)
	if err != nil {
		elog.Error("agent[node] charts search error", l.E(err))
		c.JSONE(1, "search error", err)
		return
	}
	c.JSONOK(resp)
}
