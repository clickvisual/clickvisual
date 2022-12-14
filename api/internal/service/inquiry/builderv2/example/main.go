package main

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builderv2"
)

func main() {
	traceCal, _ := builderv2.GetTableCreator(builderv2.StorageTypeTraceCal)
	fmt.Println(traceCal.GetDistributedSQL())
}
