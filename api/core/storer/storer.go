package storer

import (
	"github.com/clickvisual/clickvisual/api/core/i"
	"github.com/clickvisual/clickvisual/api/core/storer/clickhouse"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func New(ds string, params i.StorerParams) i.Storer {
	switch ds {
	case db.DatasourceClickHouse:
		return clickhouse.NewStorer(params)
	}
	return nil
}
