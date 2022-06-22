package transform

import (
	"fmt"
)

type algo interface {
	transform(t *Transform)
}

type ClickHouse2Mysql struct {
}

func (c *ClickHouse2Mysql) transform(t *Transform) {
	fmt.Println("ClickHouse2Mysql go go go")
}
