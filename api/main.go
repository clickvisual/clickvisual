package main

import (
	"fmt"
	"os"

	_ "github.com/ClickHouse/clickhouse-go/v2"

	"github.com/clickvisual/clickvisual/api/cmd"
	_ "github.com/clickvisual/clickvisual/api/cmd/sten"
	_ "github.com/clickvisual/clickvisual/api/docs"
)

// 添加注释以描述 server 信息
// @title           ClickVisual API
// @version         0.4.0
// @description    	Defines interface prefixes in terms of module overrides：
// @description  	- base : the global basic readable information module
// @description  	- storage : the log module
// @description  	- alert : the alert module
// @description  	- pandas : the data analysis module
// @description  	- cmdb : the configuration module
// @description  	- sysop : the system management module
func main() {
	err := cmd.RootCommand.Execute()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	return
}
