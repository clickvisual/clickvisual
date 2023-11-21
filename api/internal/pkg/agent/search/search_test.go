package search

import (
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
	border2, err := findBorder(file, middle+1, to, 1, 1000)
	assert.Equal(t, int64(167), border1)
	assert.Equal(t, int64(301), border2)
	assert.NoError(t, err)
}
