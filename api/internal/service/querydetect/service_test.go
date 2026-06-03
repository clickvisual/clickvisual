package querydetect

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestDetectEnvelopeWithNestedJSONString(t *testing.T) {
	rows := []map[string]interface{}{
		{
			"contents": map[string]interface{}{
				"_source_": "stderr",
				"_time_":   "2026-04-24T11:31:12.311684863+08:00",
				"content":  "{\"lv\":\"debug\",\"ts\":1777001472.311435,\"msg\":\"podDiscovery listPods success\",\"app\":\"svc-file\"}",
			},
			"tags": map[string]interface{}{
				"k8s.namespace.name": "default",
				"container.name":     "svc-file",
			},
			"time": float64(1777001472),
		},
	}

	result, err := Detect(rows)
	require.NoError(t, err)
	assert.NotEmpty(t, result.TimeCandidates)
	assert.Equal(t, "contents._time_", result.TimeCandidates[0].Path)
	assert.NotEmpty(t, result.BodyCandidates)
	assert.Equal(t, "contents.content", result.BodyCandidates[0].Path)
	assert.NotEmpty(t, result.TagCandidates)
	assert.Equal(t, "tags", result.TagCandidates[0].Path)
	assert.NotEmpty(t, result.NestedJSONCandidates)
	assert.Equal(t, "contents.content", result.NestedJSONCandidates[0].Path)

	draft := BuildNormalizationDraft(result)
	fields, err := BuildQueryableFields(rows, draft, nil)
	require.NoError(t, err)
	assert.Contains(t, fieldKeys(fields), "lv")
	assert.Contains(t, fieldKeys(fields), "msg")
	assert.Contains(t, fieldKeys(fields), "app")
	assert.Contains(t, fieldKeys(fields), "k8s.namespace.name")
}

func TestDetectBodyAndPropertiesEnvelope(t *testing.T) {
	rows := []map[string]interface{}{
		{
			"body": map[string]interface{}{
				"rev":         float64(77),
				"userId":      float64(6041628),
				"createdTime": float64(1776939231941),
				"options": map[string]interface{}{
					"hideInRecentlyUsed": false,
				},
			},
			"properties": map[string]interface{}{
				"topic":            "api_file_modoc_history",
				"produceTimestamp": float64(1776939231941),
			},
		},
	}

	result, err := Detect(rows)
	require.NoError(t, err)
	assert.Equal(t, "body", result.BodyCandidates[0].Path)
	assert.Equal(t, "properties", result.TagCandidates[0].Path)

	draft := view.NormalizationDraft{
		BodyPath:        "body",
		TagPath:         "properties",
		RequiresConfirm: true,
	}
	fields, err := BuildQueryableFields(rows, draft, nil)
	require.NoError(t, err)
	assert.Contains(t, fieldKeys(fields), "rev")
	assert.Contains(t, fieldKeys(fields), "userId")
	assert.Contains(t, fieldKeys(fields), "createdTime")
	assert.Contains(t, fieldKeys(fields), "topic")
}

func fieldKeys(in []view.QueryableField) []string {
	out := make([]string, 0, len(in))
	for _, item := range in {
		out = append(out, item.FieldKey)
	}
	return out
}
