package agent

import (
	"github.com/gotomicro/ego"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egovernor"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/router"
)

var CmdRun = &cobra.Command{
	Use:   "agent",
	Short: "启动 clickvisual agent 服务端",
	Long:  `启动 clickvisual agent 服务端`,
	PreRun: func(cmd *cobra.Command, args []string) {
		config.PreRun(cmd, args)
	},
	Run: CmdFunc,
}

func init() {
	CmdRun.InheritedFlags()
	cmd.RootCommand.AddCommand(CmdRun)
}

func CmdFunc(cmd *cobra.Command, args []string) {
	app := ego.New().
		Serve(
			egovernor.Load("server.governor").Build(),
			router.GetAgentRouter(),
		)
	err := app.Run()
	if err != nil {
		elog.Panic("start up error: " + err.Error())
	}
}
