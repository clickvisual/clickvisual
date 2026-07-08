package config

import (
	"strings"

	"github.com/gotomicro/ego/core/econf"
)

const (
	EditionFull        = "full"
	EditionPrivateLite = "private-lite"
)

func Edition() string {
	value := strings.ToLower(strings.TrimSpace(econf.GetString("app.v2Edition")))
	if value == "" {
		return EditionFull
	}
	return value
}

func IsPrivateLiteMode() bool {
	return Edition() == EditionPrivateLite
}
