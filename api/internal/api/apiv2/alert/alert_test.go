package alert

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/service"
)

func TestSettingUpdate(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.PATCH(core.Handle(SettingUpdate), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/alert/settings/2"),
			gintest.WithJsonBody(db.ReqAlertSettingUpdate{
				PrometheusTarget: "127.0.0.1:9090",
				RuleStoreType:    1,
				FilePath:         "/Users/duminxiang/cosmos/go/src/github.com/clickvisual/clickvisual/rules",
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/alert/settings/:instance-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest1.Run()
	objTest2 := gintest.Init()
	// prometheus operator
	objTest2.PATCH(core.Handle(SettingUpdate), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/alert/settings/1"),
			gintest.WithJsonBody(db.ReqAlertSettingUpdate{
				RuleStoreType:    3,
				PrometheusTarget: "127.0.0.1:9090",
				Namespace:        "default",
				ConfigPrometheusOperator: `metadata:
  labels:
    prometheus: example
    role: alert-rules
  name: clickvisual-rules-1124
  namespace: default`,
				ClusterId: 1,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/alert/settings/:instance-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest2.Run()
	objTest3 := gintest.Init()
	// prometheus file
	objTest3.PATCH(core.Handle(SettingUpdate), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/alert/settings/2"),
			gintest.WithJsonBody(db.ReqAlertSettingUpdate{
				RuleStoreType:    db.RuleStoreTypeK8sConfigMap,
				PrometheusTarget: "127.0.0.1:9090",
				Namespace:        "default",
				Configmap:        "clickvisual",
				ClusterId:        1,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/alert/settings/:instance-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest3.Run()
}
