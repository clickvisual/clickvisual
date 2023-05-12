package storer

import (
	"github.com/clickvisual/clickvisual/api/core/storer/clickhouse"
	"github.com/clickvisual/clickvisual/api/core/storer/ifstorer"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func New(ds string, params ifstorer.Params) ifstorer.Storer {
	switch ds {
	case db.DatasourceClickHouse:
		return clickhouse.NewStorer(params)
	}
	return nil
}
