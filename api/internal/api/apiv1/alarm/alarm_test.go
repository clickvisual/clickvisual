package alarm

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

func TestCreate(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest := gintest.Init()
	objTest.PATCH(core.Handle(Create), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithJsonBody(view.ReqAlarmCreate{
				Name:       "test_alarm_1",
				Interval:   1,
				Unit:       0,
				AlertRule:  "",
				View:       "",
				NoDataOp:   0,
				ChannelIds: []int{1},
				Filters: []view.ReqAlarmFilterCreate{
					{
						Tid:  5,
						When: "1=1",
						Mode: 0,
						Conditions: []view.ReqAlarmConditionCreate{
							{
								SetOperatorTyp: 0,
								SetOperatorExp: 0,
								Cond:           0,
								Val1:           1,
							},
						},
					},
					{
						Tid:  8,
						When: "1=1",
						Mode: 0,
						Conditions: []view.ReqAlarmConditionCreate{
							{
								SetOperatorTyp: 0,
								SetOperatorExp: 0,
								Cond:           0,
								Val1:           22,
							},
						},
					},
				},
				Level: 0,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/alarms"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest.Run()
}

func TestUpdate(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest := gintest.Init()
	objTest.PATCH(core.Handle(Update), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/alarms/17"),
			gintest.WithJsonBody(view.ReqAlarmCreate{
				Name:       "test_alarm_1",
				Interval:   1,
				Unit:       0,
				AlertRule:  "",
				View:       "",
				NoDataOp:   0,
				ChannelIds: []int{1},
				Filters: []view.ReqAlarmFilterCreate{
					{
						Tid:  5,
						When: "2=2",
						Mode: 0,
						Conditions: []view.ReqAlarmConditionCreate{
							{
								SetOperatorTyp: 0,
								SetOperatorExp: 0,
								Cond:           0,
								Val1:           66,
							},
						},
					},
					{
						Tid:  8,
						When: "1=1",
						Mode: 0,
						Conditions: []view.ReqAlarmConditionCreate{
							{
								SetOperatorTyp: 0,
								SetOperatorExp: 0,
								Cond:           0,
								Val1:           77,
							},
						},
					},
				},
				Level: 0,
			}))
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/alarms/:id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest.Run()
}

func TestDelete(t *testing.T) {
	config.InitCfg()
	_ = invoker.Init()
	_ = service.Init()
	objTest := gintest.Init()
	objTest.DELETE(core.Handle(Delete), func(m *gintest.Mock) error {
		byteInfo := m.Exec(
			gintest.WithUri("/alarms/17"),
		)
		assert.Equal(t, `{"code":0,"msg":"succ","data":""}`, string(byteInfo))
		return nil
	}, gintest.WithRoutePath("/alarms/:id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	_ = objTest.Run()
}
