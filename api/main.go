package main

import (
	"fmt"
	"os"

	"github.com/clickvisual/clickvisual/api/cmd"
	_ "github.com/clickvisual/clickvisual/api/cmd/agent"
)

func main() {
	err := cmd.RootCommand.Execute()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
