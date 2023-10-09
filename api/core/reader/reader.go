package reader

import (
	"github.com/clickvisual/clickvisual/api/core/i"
	"github.com/clickvisual/clickvisual/api/core/reader/clickhouse"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func New(ds string, params i.ReaderParams) i.Reader {
	switch ds {
	case db.DatasourceClickHouse:
		return clickhouse.NewReader(params)
	}
	return nil
}
