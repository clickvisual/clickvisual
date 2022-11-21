package utils

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/gotomicro/ego/core/elog"
)

// ClickhouseDsnConvert convert clickhouse-go v1.5 to v2.0
func ClickhouseDsnConvert(req string) (res string) {
	u, err := url.Parse(req)
	if err != nil {
		elog.Error("clickhouseDsnConvert", elog.Any("error", err))
		return req
	}

	query := u.Query()
	query.Del("write_timeout")
	if strings.HasPrefix(req, "clickhouse://") ||
		strings.HasPrefix(req, "http://") ||
		strings.HasPrefix(req, "https://") {
		u.RawQuery = query.Encode()
		return u.String()
	}

	database := query.Get("database")
	if database == "" {
		database = "default"
	}

	password := query.Get("password")
	if password != "" {
		password = url.QueryEscape(query.Get("password")) // 处理特殊字符
	}

	res = fmt.Sprintf("clickhouse://%s:%s@%s/%s", query.Get("username"), password, u.Host, database)
	query.Del("password")
	query.Del("username")
	query.Del("database")

	queryValAssembly(query, "read_timeout", "ms")

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
