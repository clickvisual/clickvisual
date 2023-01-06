package config

import (
	"log"
	"os"

	"github.com/gotomicro/ego/core/econf"
	_ "github.com/gotomicro/ego/core/econf/file"
	"github.com/gotomicro/ego/core/econf/manager"
	"github.com/gotomicro/ego/core/eflag"
	"github.com/spf13/cobra"
)

var File string

func PreRun(cmd *cobra.Command, args []string) {
	InitCfg()
}

func InitCfg() {
	log.Println("ConfigFile", File)
	log.Println("EGO_CONFIG_PATH:", os.Getenv("EGO_CONFIG_PATH"))
	if os.Getenv("EGO_CONFIG_PATH") != "" {
		File = os.Getenv("EGO_CONFIG_PATH")
	}
	log.Println("File", File)
	provider, parser, tag, err := manager.NewDataSource(File, eflag.Bool("watch"))
	if err != nil {
		log.Fatal("load config fail: ", err)
	}
	if err = econf.LoadFromDataSource(provider, parser, econf.WithTagName(tag)); err != nil {
		log.Fatal("data source: load config, unmarshal config err: ", err)
	}
}
