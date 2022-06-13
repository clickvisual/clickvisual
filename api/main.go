package main

import (
	"github.com/clickvisual/prom2click"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/server/egovernor"
	"github.com/gotomicro/ego/task/ejob"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/router"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/job"
)

func main() {
	app := ego.New().
		Invoker(
			invoker.Init,
			service.Init,
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
