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
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func TestCreateJSONAsString(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest1 := gintest.Init()
	// prometheus file
	objTest1.POST(core.Handle(ShortURLCreate), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/base/shorturls"),
			gintest.WithJsonBody(db.ReqShortURLCreate{
				OriginUrl: `https://mdp-hw.shimodev.com/clickvisual/share?end=1675924125&index=5&kw=application = 'uploader'and level > 40&logState=NaN&page=1&queryType=rawLog&size=10&start=1675923225&tab=relative&tid=5`,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/base/shorturls"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest1.Run()
}
