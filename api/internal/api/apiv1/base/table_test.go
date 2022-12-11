package base

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/config"
)

func TestSettingUpdate(t *testing.T) {
	config.InitCfg()
	invoker.Init()
	service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.DELETE(core.Handle(TableDelete), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/tables/16"),
		)
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/tables/:id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	objTest1.Run()
}
