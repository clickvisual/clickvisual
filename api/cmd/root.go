package cmd

import (
	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
)

func init() {
	RootCommand.PersistentFlags().StringVarP(&config.File, "config", "c", "config/default.toml", "指定配置文件，默认 config/default.toml")
}

var RootCommand = &cobra.Command{
	Use: "clickvisual",
}
