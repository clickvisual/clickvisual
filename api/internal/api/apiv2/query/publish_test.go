package query

import (
	"testing"

	"github.com/gotomicro/unittest/gintest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/router/middlewares"
)

func TestPublishDraftRouteReturnsWarnings(t *testing.T) {
	obj := gintest.Init()
	obj.POST(core.Handle(PublishDraft), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/ingestion/publish-draft"), gintest.WithJsonBody(map[string]interface{}{
			"sourceType": "kafka_json",
			"normalization": map[string]interface{}{
				"timePath":        "time",
				"bodyPath":        "contents.content",
				"tagPath":         "tags",
				"needNestedJson":  true,
				"nestedJsonPath":  "contents.content",
				"requiresConfirm": true,
			},
			"queryableFields": []map[string]interface{}{
				{
					"fieldKey":             "app",
					"displayName":          "app",
					"path":                 "app",
					"source":               "json_path",
					"valueType":            "string",
					"isScalar":             true,
					"coverage":             1,
					"stability":            1,
					"recommendedOperators": []string{"="},
					"isAccelerated":        false,
					"accelerationStatus":   "none",
				},
			},
			"defaultFields": []string{"app"},
		}))
		assert.Contains(t, string(body), `"code":0`)
		assert.Contains(t, string(body), `"requiresConfirm":true`)
		assert.Contains(t, string(body), `"publish.default_fields_json_only"`)
		return nil
	}, gintest.WithRoutePath("/query/ingestion/publish-draft"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, obj.Run())
}

func TestPublishRouteRejectsInvalidPayload(t *testing.T) {
	obj := gintest.Init()
	obj.POST(core.Handle(Publish), func(m *gintest.Mock) error {
		body := m.Exec(gintest.WithUri("/query/ingestion/publish"), gintest.WithJsonBody(map[string]interface{}{
			"target": "invalid",
		}))
		assert.Contains(t, string(body), `"code":1`)
		assert.Contains(t, string(body), `invalid parameter`)
		return nil
	}, gintest.WithRoutePath("/query/ingestion/publish"), gintest.WithRouteMiddleware(middlewares.SetMockUser()))
	require.NoError(t, obj.Run())
}
