package server

import (
	"log"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/inspect_log_cron"
	"github.com/clickvisual/prom2click"
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egovernor"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/router"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/pandas/worker"
)

var CmdRun = &cobra.Command{
	Use:   "server",
	Short: "启动 clickvisual server 服务端",
	Long:  `启动 clickvisual server 服务端`,
	PreRun: func(cmd *cobra.Command, args []string) {
		log.Println("PreRun args: ", args)
		config.PreRun(cmd, args)
	},
	Run: CmdFunc,
}

func init() {
	CmdRun.InheritedFlags()
	cmd.RootCommand.AddCommand(CmdRun)
}

func CmdFunc(cmd *cobra.Command, args []string) {
	app := ego.New(
		ego.WithBeforeStopClean(
			worker.Close,
			service.Close,
		)).
		Invoker(
			invoker.Init,
			service.Init,
			worker.Init,
		)

	// 日志巡检定时任务
	app = inspect_log_cron.InspectLogCron(app)
	app.Serve(
		egovernor.Load("server.governor").Build(),
		router.GetServerRouter(),
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
