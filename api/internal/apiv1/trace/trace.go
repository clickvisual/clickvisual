package trace

import (
	"github.com/shimohq/mogo/api/pkg/component/core"
)

func Info(c *core.Context) {
	// tid := cast.ToInt(c.Param("tid"))
	// if tid == 0 {
	// 	c.JSONE(core.CodeErr, "invalid parameter", nil)
	// 	return
	// }
	// var param view.ReqQuery
	// err := c.Bind(&param)
	// if err != nil {
	// 	c.JSONE(core.CodeErr, "invalid parameter: "+err.Error(), nil)
	// 	return
	// }
	// if param.Database == "" || param.Table == "" {
	// 	c.JSONE(core.CodeErr, "db and table are required fields", nil)
	// 	return
	// }
	// op, err := service.InstanceManager.Load(param.InstanceId)
	// if err != nil {
	// 	c.JSONE(core.CodeErr, err.Error(), nil)
	// 	return
	// }
	// param, err = op.Prepare(param)
	// if err != nil {
	// 	c.JSONE(core.CodeErr, "invalid parameter. "+err.Error(), nil)
	// 	return
	// }
	// list := op.GroupBy(param)
	// elog.Debug("Indexes", elog.Any("list", list))
	//
	// res := make([]view.RespIndexItem, 0)
	// sum := uint64(0)
	// for _, row := range list {
	// 	sum += row
	// }
	// for k, v := range list {
	// 	res = append(res, view.RespIndexItem{
	// 		IndexName: k,
	// 		Count:     v,
	// 		Percent:   kfloat.Decimal(float64(v) * 100 / float64(sum)),
	// 	})
	// }
	// sort.Slice(res, func(i, j int) bool {
	// 	return res[i].Count > res[j].Count
	// })
	// elog.Debug("Indexes", elog.Any("res", res))
	// if len(res) > 10 {
	// 	c.JSONOK(res[:9])
	// 	return
	// }
	// c.JSONOK(res)
	// return
}
