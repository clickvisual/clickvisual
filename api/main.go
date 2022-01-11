package main

import (
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egovernor"
	"github.com/gotomicro/ego/task/ejob"
	"github.com/shimohq/mogo/api/pkg/job"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/router"
	"github.com/shimohq/mogo/api/internal/service"
)

func main() {
	err := ego.New().
		Invoker(
			invoker.Init,
			service.Init,
		).
		Job(ejob.Job("install", job.RunInstall)).
		Serve(
			egovernor.Load("server.governor").Build(),
			router.GetRouter(),
		).Run()
	if err != nil {
		elog.Panic("start up error: " + err.Error())
	}
}
