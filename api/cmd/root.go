package cmd

import (
	"log"

	"github.com/clickvisual/prom2click"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egovernor"
	"github.com/gotomicro/ego/task/ejob"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/router"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/worker"
	"github.com/clickvisual/clickvisual/api/pkg/config"
	"github.com/clickvisual/clickvisual/api/pkg/job"
)

var RootCommand = &cobra.Command{
	Use: "clickvisual",
	PreRun: func(cmd *cobra.Command, args []string) {
		log.Println("PreRun args: ", args)
		config.PreRun(cmd, args)
	},
	Run: func(cmd *cobra.Command, args []string) {
		log.Println("Run args: ", args)
		if len(args) == 0 {
			FC(cmd, args)
		}
	},
}

func init() {
	RootCommand.PersistentFlags().StringVarP(&config.File, "config", "c", "config/default.toml", "指定配置文件，默认 config/default.toml")
}

func FC(cmd *cobra.Command, args []string) {
	app := ego.New(
		ego.WithBeforeStopClean(
			worker.Close,
			service.Close,
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
	if econf.GetBool("prom2click.enable") {
		// Compatible with historical versions
		if econf.GetString("prom2click.dev.host") != "" {
			app.Serve(prom2click.Load("prom2click.dev").Build())
		}
		if len(econf.GetSlice("prom2click.cfgs")) > 0 {
			for _, container := range prom2click.LoadBatch("prom2click.cfgs") {
				app.Serve(container.Build())
			}
		}
	}
	err := app.Run()
	if err != nil {
		elog.Panic("start up error: " + err.Error())
	}
}
