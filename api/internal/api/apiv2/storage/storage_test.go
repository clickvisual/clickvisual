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
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

func TestCreate(t *testing.T) {
	config.InitCfg()
	invoker.Init()
	service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.POST(core.Handle(Create), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/storage"),
			gintest.WithJsonBody(view.ReqStorageCreate{
				TableName: "demo_0131_v5",
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
	objTest1.Run()
}
