package source

import (
	"fmt"
	"github.com/stretchr/testify/assert"
	"testing"
)

func testDSN() string {
	return fmt.Sprintf("http://root:root@localhost:8081/default")
}

func mockDatabend() *Databend {
	return &Databend{
		s: &Source{
			DSN:      testDSN(),
			URL:      "localhost:8081",
			UserName: "root",
			Password: "root",
			Typ:      3,
		},
	}
}

func TestDatabases(t *testing.T) {
	mock := mockDatabend()
	res, err := mock.Databases()
	fmt.Println(res)
	assert.NoError(t, err)
}

func TestTables(t *testing.T) {
	mock := mockDatabend()
	res, err := mock.Tables("default")
	fmt.Println(res)
	assert.NoError(t, err)
}

func TestColumns(t *testing.T) {
	mock := mockDatabend()
	res, err := mock.Columns("default", "_airbyte_raw_append_stream")
	fmt.Println(res)
	assert.NoError(t, err)
}
