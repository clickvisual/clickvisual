package sten

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	"github.com/clickvisual/clickvisual/api/pkg/config"
)

var CmdRun = &cobra.Command{
	Use:   "sten",
	Short: "create a log library from a template",
	Long: `create a log library from a template
	`,
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
	fmt.Println("hello world")
	select {}
}
