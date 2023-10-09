package storage

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/config"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/service"
)

func TestCreateJSONAsString(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.POST(core.Handle(Create), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/storage"),
			gintest.WithJsonBody(view.ReqStorageCreate{
				TableName: "demo_0201_v4",
				Typ:       1,
				Days:      1,
				Brokers:   "192.168.64.65:9092",
				// Brokers:                 "127.0.0.1:9092",
				Topics:                  "otlp_spans",
				Consumers:               1,
				KafkaSkipBrokenMessages: 0,
				Desc:                    "",
				Source:                  `{"traceId":"Fb+zNSioVyVKOrfRWne+RA==","spanId":"qrZYdy1h9oo=","operationName":"resource_fetch_span","startTime":"2023-01-13T08:52:03.034799900Z","duration":"1.195900100s","tags":[{"key":"otel.library.name","vStr":"enter_file"},{"key":"http.client_ip","vStr":"219.233.199.199"},{"key":"ip_country","vStr":"China"},{"key":"ip_province","vStr":"Shanghai"},{"key":"ip_city","vStr":"Shanghai"},{"key":"ip_latitude","vStr":"31.222219"},{"key":"ip_longitude","vStr":"121.458061"},{"key":"span.kind","vStr":"internal"}],"process":{"serviceName":"frontend","tags":[{"key":"telemetry.sdk.language","vStr":"webjs"},{"key":"telemetry.sdk.name","vStr":"opentelemetry"},{"key":"telemetry.sdk.version","vStr":"1.8.0"}]}}`,
				DatabaseId:              14,
				TimeField:               "startTime",
				RawLogField:             "",
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/storage"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest1.Run()
}

func TestCreateJSONEachRow(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.POST(core.Handle(Create), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/storage"),
			gintest.WithJsonBody(view.ReqStorageCreate{
				TableName: "demo_0201_v3",
				Typ:       1,
				Days:      1,
				// Brokers:   "192.168.64.65:9092",
				Brokers:                 "127.0.0.1:9092",
				Topics:                  "otlp_spans",
				Consumers:               1,
				KafkaSkipBrokenMessages: 0,
				Desc:                    "",
				Source:                  `{"_time_":"2022-11-08T10:35:58.837927Z","_log_":"","_source_":"stdout","_pod_name_":"xx-x-xx","time":"xx-x-xx","_namespace_":"default","_node_name_":"xx-f.192.x.119.x","_container_name_":"xx","_cluster_":"xx","_log_agent_":"xx-b","_node_ip_":"192.1"}`,
				DatabaseId:              14,
				TimeField:               "_time_",
				RawLogField:             "_log_",
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/storage"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest1.Run()
}

func TestCreateStorageByTemplate(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.POST(core.Handle(CreateStorageByTemplate), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/storage/ilogtail"),
			gintest.WithJsonBody(view.ReqCreateStorageByTemplateILogtail{
				Name:       "demo_0614_v1",
				Brokers:    "127.0.0.1:9092",
				DatabaseId: 14,
				Topic:      "otlp_spans",
				Days:       1,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/storage/:template"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest1.Run()
}
