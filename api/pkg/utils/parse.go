package utils

import (
	"net/url"
	"os"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/invoker"
)

func ParseAppUrlAndSubUrl(appUrl string) (string, string, error) {
	if appUrl == "" {
		appUrl = "http://localhost:19001/"
	}
	if appUrl[len(appUrl)-1] != '/' {
		appUrl += "/"
	}
	// Check if has app suburl.
	urlParsed, err := url.Parse(appUrl)
	if err != nil {
		invoker.Logger.Error("Invalid root_url.", elog.String("url", appUrl), elog.String("error", err.Error()))
		os.Exit(1)
	}
	appSubUrl := strings.TrimSuffix(urlParsed.Path, "/")
	return appUrl, appSubUrl, nil
}
