package inspect_log_cron

import (
	"context"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/task/ecron"
)

// InspectLogCron 日志巡检定时任务
// inspectLog.namespace: clickvisual agent daemonset namespace
func InspectLogCron(app *ego.Ego) *ego.Ego {
	job := func(ctx context.Context) error {
		search.Run(search.Request{
			Date:          econf.GetString("inspectLog.date"),
			KeyWord:       econf.GetString("inspectLog.keyWord"),
			Limit:         econf.GetInt64("inspectLog.limit"),
			IsK8S:         true,
			IsUploadExcel: econf.GetBool("inspectLog.enable"),
			IsAllCurl:     true,
			K8SContainer:  econf.GetStringSlice("inspectLog.containers"),
			Namespace:     econf.GetString("inspectLog.namespace"),
		})
		return nil
	}
	if econf.GetBool("inspectLog.enable") {
		cron := ecron.Load("inspectLog").Build(ecron.WithJob(job))
		app.Cron(cron)
	}

	return app
}
