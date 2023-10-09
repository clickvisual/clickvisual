package switcher

import (
	"github.com/clickvisual/clickvisual/api/core/i"
	"github.com/clickvisual/clickvisual/api/core/switcher/clickhouse"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func New(ds string, params i.SwitcherParams) i.Switcher {
	switch ds {
	case db.DatasourceClickHouse:
		return clickhouse.NewSwitcher(params)
	}
	return nil
}
