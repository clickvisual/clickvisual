package main

import (
	"log"
	"os"

	cvconfig "github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/service/install"
)

func main() {
	os.Setenv("EGO_CONFIG_PATH", "./configs/local.toml")
	cvconfig.InitCfg()
	if err := install.Migration(); err != nil {
		log.Fatal(err)
	}
	log.Println("migration ok")
}
