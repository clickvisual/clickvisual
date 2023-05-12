package switcher

import (
	"github.com/clickvisual/clickvisual/api/core/switcher/clickhouse"
	"github.com/clickvisual/clickvisual/api/core/switcher/ifswitcher"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func New(ds string, params ifswitcher.Params) ifswitcher.Switcher {
	switch ds {
	case db.DatasourceClickHouse:
		return clickhouse.NewSwitcher(params)
	}
	return nil
}
