package search

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_Index(t *testing.T) {
	str, pos := Index(`"ts":"2023-08-23 23:22:12" 12345`, `"ts":"`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	fmt.Printf("pos--------------->"+"%+v\n", pos)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_MidIndex(t *testing.T) {
	str, pos := Index(`"lv":"info","ts":"2023-08-23 23:22:12" 12345`, `"ts":"`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	fmt.Printf("pos--------------->"+"%+v\n", pos)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_getValue(t *testing.T) {
	str := getValue(`2023-08-23 23:22:12" 12345`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}
