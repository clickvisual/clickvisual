package command

import (
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search"

	"github.com/clickvisual/clickvisual/api/cmd"
)

var request = search.CmdRequest{}

var CmdRun = &cobra.Command{
	Use:   "command",
	Short: "启动 clickvisual 命令行",
	Long:  `启动 clickvisual 命令行`,
	Run:   CmdFunc,
}

func init() {
	CmdRun.PersistentFlags().StringVarP(&request.Dir, "dir", "d", "", "日志文件夹路径")
	CmdRun.PersistentFlags().StringVarP(&request.Path, "path", "p", "", "日志文件路径")
	CmdRun.PersistentFlags().StringVarP(&request.StartTime, "start", "s", "", "搜索日志开始时间")
	CmdRun.PersistentFlags().StringVarP(&request.EndTime, "end", "e", "", "搜索日志结束时间")
	CmdRun.PersistentFlags().StringVarP(&request.KeyWord, "key", "k", "", "搜索的关键词")
	CmdRun.PersistentFlags().Int64VarP(&request.Limit, "limit", "l", 5, "查询记录条数")
	CmdRun.PersistentFlags().StringVarP(&request.Date, "date", "t", "last 6h", "日期会有默认查询时间，默认last 6h")
	CmdRun.PersistentFlags().BoolVarP(&request.IsK8S, "k8s", "z", false, "是否为k8s")
	CmdRun.PersistentFlags().StringArrayVarP(&request.K8SContainer, "container", "y", []string{}, "k8s container名字")
	cmd.RootCommand.AddCommand(CmdRun)
}

func CmdFunc(cmd *cobra.Command, args []string) {
	search.Run(request.ToRequest())
}
