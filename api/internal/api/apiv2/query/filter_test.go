package query

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
	"github.com/clickvisual/clickvisual/api/internal/service/queryfilter"
)

func TestQueryFilterCRUDRoutes(t *testing.T) {
	queryfilter.ResetForTest()

	create := gintest.Init()
	create.POST(core.Handle(Create), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/filters"), gintest.WithJsonBody(newReq("gateway timeout")))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"id":1`)
		assert.Contains(t, string(body), `"creator":"clickvisual"`)
		return nil
	}, gintest.WithRoutePath("/query/filters"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, create.Run())

	list := gintest.Init()
	list.GET(core.Handle(List), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/filters?instanceId=1&database=default&table=logs"))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"name":"gateway timeout"`)
		return nil
	}, gintest.WithRoutePath("/query/filters"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, list.Run())

	get := gintest.Init()
	get.GET(core.Handle(Get), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/filters/1"))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"id":1`)
		return nil
	}, gintest.WithRoutePath("/query/filters/:filter-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, get.Run())

	update := gintest.Init()
	update.PUT(core.Handle(Update), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/filters/1"), gintest.WithJsonBody(newReq("gateway timeout v2")))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"name":"gateway timeout v2"`)
		return nil
	}, gintest.WithRoutePath("/query/filters/:filter-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, update.Run())

	remove := gintest.Init()
	remove.DELETE(core.Handle(Delete), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/filters/1"))
		assert.JSONEq(t, `{"code":0,"msg":"succ","data":{"id":1}}`, string(body))
		return nil
	}, gintest.WithRoutePath("/query/filters/:filter-id"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, remove.Run())
}

func TestQueryFilterCreateValidationError(t *testing.T) {
	queryfilter.ResetForTest()

	obj := gintest.Init()
	obj.POST(core.Handle(Create), func(m *gintest.Mock) error {
		body := m.Exec(
			gintest.WithUri("/query/filters"),
			gintest.WithJsonBody(view.ReqQueryFilterUpsert{
				Name:         "bad range",
				InstanceID:   1,
				InstanceName: "prod clickhouse",
				Database:     "default",
				Table:        "logs",
				TimeRange: view.QueryFilterTimeRange{
					StartTime: "2026-04-21T09:30",
					EndTime:   "2026-04-21T08:30",
				},
				Conditions: []view.QueryFilterCondition{
					{ID: "cond_1", Field: "service", Operator: "=", Value: "gateway", ValueType: "string"},
				},
			}),
		)
		assert.JSONEq(t, `{"code":1,"msg":"endTime MUST be greater than startTime","data":null}`, string(body))
		return nil
	}, gintest.WithRoutePath("/query/filters"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, obj.Run())
}

func newReq(name string) view.ReqQueryFilterUpsert {
	return view.ReqQueryFilterUpsert{
		Name:         name,
		InstanceID:   1,
		InstanceName: "prod clickhouse",
		Database:     "default",
		Table:        "logs",
		TimeRange: view.QueryFilterTimeRange{
			StartTime: "2026-04-21T08:30",
			EndTime:   "2026-04-21T09:30",
		},
		Conditions: []view.QueryFilterCondition{
			{ID: "cond_1", Field: "service", Operator: "=", Value: "gateway", ValueType: "string"},
		},
	}
}
