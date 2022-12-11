package storage

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/config"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func TestSettingUpdate(t *testing.T) {
	config.InitCfg()
	invoker.Init()
	service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.POST(core.Handle(Create), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/storage"),
			gintest.WithJsonBody(view.ReqStorageCreateV3{
				TableName:               "demo_1209_v1",
				Days:                    1,
				Brokers:                 "127.0.0.1:9092",
				Topics:                  "Test",
				Consumers:               1,
				KafkaSkipBrokenMessages: 0,
				Desc:                    "",
				DatabaseId:              7,
				TimeField:               "",
				TimeFieldType:           0,
				IsKafkaTimestamp:        0,
				V3TableType:             0,
				CreateType:              constx.TableCreateTypeBufferNullDataPipe,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/storage"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	objTest1.Run()
}
