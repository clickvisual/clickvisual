package main

import (
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/server/egovernor"
	"github.com/gotomicro/ego/task/ejob"

	_ "github.com/ClickHouse/clickhouse-go/v2"
	"github.com/clickvisual/prom2click"

	_ "github.com/clickvisual/clickvisual/api/docs"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/router"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/bigdata/worker"
	"github.com/clickvisual/clickvisual/api/pkg/job"
)

// 添加注释以描述 server 信息
// @title           ClickVisual API
// @version         0.4.0
// @description    	Defines interface prefixes in terms of module overrides：
// @description  	- base : the global basic readable information module
// @description  	- storage : the log module
// @description  	- alarm : the alarm module
// @description  	- pandas : the data analysis module
// @description  	- cmdb : the configuration module
// @description  	- sysop : the system management module
func main() {
	app := ego.New(
		ego.WithBeforeStopClean(
			worker.Close,
		)).
		Invoker(
			invoker.Init,
			service.Init,
			worker.Init,
		).
		Job(ejob.Job("install", job.RunInstall)).
		Serve(
			egovernor.Load("server.governor").Build(),
			router.GetRouter(),
		)
	// prom2click
	if econf.GetBool("prom2click.enable") {
		app.Serve(prom2click.Load("prom2click.dev").Build())
	}
	err := app.Run()
	if err != nil {
		invoker.Logger.Panic("start up error: " + err.Error())
	}
}
