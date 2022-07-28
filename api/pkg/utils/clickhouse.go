package utils

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

// ClickhouseDsnConvert convert clickhouse-go v1.5 to v2.0
func ClickhouseDsnConvert(req string) (res string) {
	if strings.HasPrefix(req, "clickhouse://") {
		return req
	}
	u, err := url.Parse(req)
	if err != nil {
		invoker.Logger.Error("clickhouseDsnConvert", elog.Any("error", err))
		return req
	}
	query := u.Query()
	database := query.Get("database")
	if database == "" {
		database = "default"
	}
	res = fmt.Sprintf("clickhouse://%s:%s@%s/%s", query.Get("username"), query.Get("password"), u.Host, database)
	query.Del("username")
	query.Del("password")
	query.Del("database")

	queryValAssembly(query, "read_timeout", "ms")
	queryValAssembly(query, "write_timeout", "ms")

	if len(query) != 0 {
		res = fmt.Sprintf("%s?%s", res, query.Encode())
	}

	return
}

func queryValAssembly(query url.Values, key, unit string) {
	if query.Has(key) {
		rt := query.Get(key)
		query.Set(key, rt+unit)
	}
}
