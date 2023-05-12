package reader

import (
	"github.com/clickvisual/clickvisual/api/core/reader/clickhouse"
	"github.com/clickvisual/clickvisual/api/core/reader/ifreader"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func New(ds string, params ifreader.Params) ifreader.Reader {
	switch ds {
	case db.DatasourceClickHouse:
		return clickhouse.NewReader(params)
	}
	return nil
}
