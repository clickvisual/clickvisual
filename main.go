package main

import (
	"fmt"
	"os"

	"github.com/clickvisual/clickvisual/api/cmd"
	_ "github.com/clickvisual/clickvisual/api/cmd/agent"
	_ "github.com/clickvisual/clickvisual/api/cmd/changepwd"
	_ "github.com/clickvisual/clickvisual/api/cmd/command"
	_ "github.com/clickvisual/clickvisual/api/cmd/init"
	_ "github.com/clickvisual/clickvisual/api/cmd/server"
	_ "github.com/clickvisual/clickvisual/api/cmd/upload"
)

func main() {
	err := cmd.RootCommand.Execute()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
