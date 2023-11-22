package command

import (
	"log"

	"github.com/gotomicro/ego/core/elog"
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/internal/pkg/config"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"

	"github.com/clickvisual/clickvisual/api/cmd"
)

var request = search.CmdRequest{}

var CmdRun = &cobra.Command{
	Use:   "command",
	Short: "启动 clickvisual 命令行",
	Long:  `启动 clickvisual 命令行`,
	Run:   CmdFunc,
	PreRun: func(cmd *cobra.Command, args []string) {
		log.Println("PreRun args: ", args)
		config.PreRun(cmd, args)
	},
}

func init() {
	CmdRun.PersistentFlags().StringVar(&request.Dir, "dir", "", "指定日志文件夹路径")
	CmdRun.PersistentFlags().StringVar(&request.Path, "path", "", "指定日志文件路径")
	CmdRun.PersistentFlags().StringVar(&request.StartTime, "start", "", "指定开始时间")
	CmdRun.PersistentFlags().StringVar(&request.EndTime, "end", "", "指定结束时间")
	CmdRun.PersistentFlags().StringVar(&request.KeyWord, "key", "", `指定关键词,例如key="lv=error"`)
	CmdRun.PersistentFlags().Int64Var(&request.Limit, "limit", 20, "日志最大渲染条数，默认20条")
	CmdRun.PersistentFlags().StringVar(&request.Date, "date", "last 6h", "日期会有默认查询时间，默认last 6h")
	CmdRun.PersistentFlags().BoolVar(&request.IsK8S, "k8s", false, "是否为k8s")
	CmdRun.PersistentFlags().StringArrayVar(&request.K8SContainer, "container", []string{}, "k8s container名字")
	cmd.RootCommand.AddCommand(CmdRun)
}

// CmdFunc 实验性方法 2023-11-08
func CmdFunc(cmd *cobra.Command, args []string) {
	_, err := search.Run(request.ToRequest())
	if err != nil {
		elog.Error("agent command error", elog.String("path", request.Path), elog.String("dir", request.Dir), elog.FieldErr(err))
	}
}
