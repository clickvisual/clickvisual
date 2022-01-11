package inquiry

import (
	"sort"
	"sync"

	"github.com/gotomicro/ego/core/elog"
	"github.com/kl7sn/toolkit/kfloat"

	"github.com/shimohq/mogo/api/internal/service"
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/view"
)

func Logs(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "参数无效: "+err.Error(), nil)
		return
	}
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db 和 table 为必填字段", nil)
		return
	}
	op := service.InstanceManager.Load(param.DatasourceType, param.InstanceName)
	if op == nil {
		c.JSONE(core.CodeErr, "不存在对应配置实例:  ", nil)
		return
	}
	res, err := op.GET(op.Prepare(param))
	if err != nil {
		c.JSONE(core.CodeErr, "查询失败. "+err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

func Charts(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "参数无效: "+err.Error(), nil)
		return
	}
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db 和 table 为必填字段", nil)
		return
	}
	op := service.InstanceManager.Load(param.DatasourceType, param.InstanceName)
	if op == nil {
		c.JSONE(core.CodeErr, "不存在对应配置实例:  ", nil)
		return
	}
	// Calculate 50 intervals
	res := view.HighCharts{
		Histograms: make([]view.HighChart, 0),
	}
	param = op.Prepare(param)
	interval := (param.ET - param.ST) / 50
	isZero := true
	elog.Debug("Charts", elog.Any("interval", interval), elog.Any("st", param.ST), elog.Any("et", param.ET))

	if interval == 0 {
		row := view.HighChart{
			Count:    op.Count(param),
			Progress: "",
			From:     param.ST,
			To:       param.ET,
		}
		if row.Count > 0 {
			isZero = false
		}
		res.Histograms = append(res.Histograms, row)
	} else {
		limiter := make(chan view.HighChart, 100)
		wg := &sync.WaitGroup{}
		for i := param.ST; i <= param.ET; i += interval {
			wg.Add(1)
			go func(st, et int64, wg *sync.WaitGroup) {
				row := view.HighChart{
					Count: op.Count(view.ReqQuery{
						DatasourceType: param.DatasourceType,
						Table:          param.Table,
						DatabaseTable:  param.DatabaseTable,
						Query:          param.Query,
						ST:             st,
						ET:             et,
						Page:           param.Page,
						PageSize:       param.PageSize,
					}),
					Progress: "",
					From:     st,
					To:       et,
				}
				if isZero && row.Count > 0 {
					isZero = false
				}
				limiter <- row
				wg.Done()
				return
			}(i, i+interval, wg)
		}
		wg.Wait()
		close(limiter)
		for d := range limiter {
			res.Histograms = append(res.Histograms, d)
		}
	}
	if isZero {
		c.JSONE(core.CodeOK, "查询数据为空. ", nil)
		return
	}
	sort.Slice(res.Histograms, func(i int, j int) bool {
		return res.Histograms[i].From < res.Histograms[j].From
	})
	c.JSONOK(res)
	return
}

func Tables(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "参数无效: "+err.Error(), nil)
		return
	}
	if param.Database == "" {
		c.JSONE(core.CodeErr, "db 为必填字段", nil)
		return
	}
	op := service.InstanceManager.Load(param.DatasourceType, param.InstanceName)
	if op == nil {
		c.JSONE(core.CodeErr, "不存在对应配置实例:  ", nil)
		return
	}
	res, err := op.Tables(param.Database)
	if err != nil {
		c.JSONE(core.CodeErr, "查询失败. "+err.Error(), nil)
		return
	}
	c.JSONOK(res)
	return
}

func Databases(c *core.Context) {
	var param view.ReqDatabases
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "参数无效: "+err.Error(), nil)
		return
	}
	// 获取全部实例下的 databases
	if param.DatasourceType == "" && param.InstanceName == "" {
		ops := service.InstanceManager.All()
		res := make([]view.RespDatabase, 0)
		for _, op := range ops {
			tmp, err := op.Databases()
			if err != nil {
				elog.Error("Databases", elog.String("err", err.Error()))
				continue
			}
			res = append(res, tmp...)
		}
		c.JSONOK(res)
		return
	}
	op := service.InstanceManager.Load(param.DatasourceType, param.InstanceName)
	if op == nil {
		c.JSONE(core.CodeErr, "未查询到对应实例数据 ", nil)
		return
	}
	res, err := op.Databases()
	if err != nil {
		elog.Error("Databases", elog.String("err", err.Error()))
	}
	c.JSONOK(res)
	return
}

func Indexes(c *core.Context) {
	var param view.ReqQuery
	err := c.Bind(&param)
	if err != nil {
		c.JSONE(core.CodeErr, "参数无效: "+err.Error(), nil)
		return
	}
	if param.Database == "" || param.Table == "" {
		c.JSONE(core.CodeErr, "db 和 table 为必填字段", nil)
		return
	}
	op := service.InstanceManager.Load(param.DatasourceType, param.InstanceName)
	if op == nil {
		c.JSONE(core.CodeErr, "不存在对应配置实例:  ", nil)
		return
	}
	list := op.GroupBy(op.Prepare(param))

	res := make([]view.RespIndexItem, 0)
	sum := uint64(0)
	for _, row := range list {
		sum += row
	}
	for k, v := range list {
		res = append(res, view.RespIndexItem{
			IndexName: k,
			Count:     v,
			Percent:   kfloat.Decimal(float64(v) * 100 / float64(sum)),
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Count > res[j].Count
	})
	elog.Debug("Indexes", elog.Any("res", res))
	c.JSONOK(res)
	return
}
