package config

import (
	"log"

	"github.com/gotomicro/ego/core/econf"
	_ "github.com/gotomicro/ego/core/econf/file"
	"github.com/gotomicro/ego/core/econf/manager"
	"github.com/gotomicro/ego/core/eflag"
	"github.com/spf13/cobra"
)

var File string

func PreRun(cmd *cobra.Command, args []string) {
	log.Println("ConfigFile", File)
	provider, parser, tag, err := manager.NewDataSource(File, eflag.Bool("watch"))
	if err != nil {
		log.Fatal("load config fail", err)
	}
	if err = econf.LoadFromDataSource(provider, parser, econf.WithTagName(tag)); err != nil {
		log.Fatal("data source: load config, unmarshal config err", err)
	}
}
