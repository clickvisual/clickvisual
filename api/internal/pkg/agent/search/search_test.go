package search

import (
	"fmt"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFindBorder(t *testing.T) {
	file, err := os.Open("test_files/1.testlog")
	if err != nil {
		t.Error(err)
	}
	fileInfo, err := file.Stat()
	if err != nil {
		t.Error(err)
	}
	from := int64(0)
	to := fileInfo.Size() - 1
	middle := (from + to) / 2
	border1, err := findBorder(file, from, middle, -1, 1000)
	if err != nil {
		t.Error(err)
	}
	border2, err := findBorder(file, middle+1, to, 1, 1000)
	if err != nil {
		t.Error(err)
	}
	assert.Equal(t, int64(167), border1)
	assert.Equal(t, int64(301), border2)
	assert.NoError(t, err)
}

func Test_ltAndGt(t *testing.T) {
	p := ltAndGt([]byte(`{"lv":"info","cost":1.35}`), CustomSearch{
		Key:          "cost",
		ValueFloat64: 2,
		Operate:      KeySearchOperateLT,
		Type:         KeySearchTypeFloat64,
	}, true)
	fmt.Printf("p--------------->"+"%+v\n", p)
}
