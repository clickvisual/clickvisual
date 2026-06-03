package query

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
)

func TestCompileRouteReturnsQueryPlan(t *testing.T) {
	obj := gintest.Init()
	obj.POST(core.Handle(Compile), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/compile"), gintest.WithJsonBody(map[string]interface{}{
			"tid":      1,
			"st":       1710000000,
			"et":       1710003600,
			"page":     1,
			"pageSize": 20,
			"conditions": []map[string]interface{}{
				{
					"field": map[string]interface{}{
						"fieldKey":      "lv",
						"displayName":   "lv",
						"source":        "json_path",
						"path":          "lv",
						"valueType":     "string",
						"isAccelerated": false,
					},
					"operator": "contains",
					"value":    "debug",
				},
			},
			"sorts":         []map[string]interface{}{},
			"displayFields": []string{},
		}))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"plannedConditions"`)
		assert.Contains(t, string(body), `"execution":"json_path"`)
		return nil
	}, gintest.WithRoutePath("/query/compile"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, obj.Run())
}
