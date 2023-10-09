package base

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/service"
)

func TestSettingUpdate(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.DELETE(core.Handle(TableDelete), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/tables/16"),
		)
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/tables/:id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest1.Run()
}
