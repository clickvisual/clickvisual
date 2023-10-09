package search

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestContainer_isSearchByTime(t *testing.T) {
	obj := NewComponent("2023-08-22 23:00:00", "2023-10-01 00:00:00", "test_files/ego2.sys", "", 1)
	flag := obj.isSearchByStartTime(`{"lv":"info","ts":"2023-09-25 11:10:25","caller":"file/file.go:97","msg":"read watch","comp":"core.econf","comp":"file datasource","configFile":"/data/config/svc-history.toml","realConfigFile":"/data/config/svc-history.toml","fppath":"/data/config/svc-history.toml"}`)
	assert.True(t, flag)
}
