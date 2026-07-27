package config

import (
	"testing"

	"github.com/gotomicro/ego/core/econf"
	"github.com/stretchr/testify/assert"
)

func TestEditionDefaultsToFull(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)

	assert.Equal(t, EditionFull, Edition())
	assert.False(t, IsPrivateLiteMode())
}

func TestEditionDetectsPrivateLite(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", " private-lite ")

	assert.Equal(t, EditionPrivateLite, Edition())
	assert.True(t, IsPrivateLiteMode())
}

func TestEditionKeepsUnknownValuesAsNonLite(t *testing.T) {
	econf.Reset()
	t.Cleanup(econf.Reset)
	econf.Set("app.v2Edition", "enterprise")

	assert.Equal(t, "enterprise", Edition())
	assert.False(t, IsPrivateLiteMode())
}
