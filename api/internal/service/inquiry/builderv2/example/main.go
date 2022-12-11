package main

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builderv2"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
)

func main() {
	traceCal, _ := builderv2.GetTableCreator(constx.TableCreateTypeBufferNullDataPipe)
	names, sqls := traceCal.GetSQLs()
	fmt.Println(sqls)
	fmt.Println(names)
}
