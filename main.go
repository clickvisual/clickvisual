package main

import (
	"fmt"
	"os"

	"github.com/clickvisual/clickvisual/api/cmd"
	_ "github.com/clickvisual/clickvisual/api/cmd/agent"
	_ "github.com/clickvisual/clickvisual/api/cmd/command"
	_ "github.com/clickvisual/clickvisual/api/cmd/server"
	_ "github.com/clickvisual/clickvisual/api/cmd/upload"
	_ "git.shimo.im/gopkg/gorm-to-dm"

)

func main() {
	err := cmd.RootCommand.Execute()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
