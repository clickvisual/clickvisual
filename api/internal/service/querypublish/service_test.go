package querypublish

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestBuildPublishDraftIncludesJSONOnlyWarning(t *testing.T) {
	resp, err := BuildPublishDraft(view.PublishDraftRequest{
		SourceType: "kafka_json",
		Normalization: view.NormalizationDraft{
			TimePath:        "time",
			BodyPath:        "contents.content",
			TagPath:         "tags",
			NeedNestedJSON:  true,
			NestedJSONPath:  "contents.content",
			RequiresConfirm: true,
		},
		QueryableFields: []view.QueryableField{
			{
				FieldKey:           "app",
				Path:               "app",
				IsAccelerated:      false,
				AccelerationStatus: "none",
			},
			{
				FieldKey:           "msg",
				Path:               "msg",
				IsAccelerated:      false,
				AccelerationStatus: "none",
			},
		},
		DefaultFields: []string{"app", "msg", "app"},
	})
	require.NoError(t, err)
	assert.Equal(t, []string{"app", "msg"}, resp.DefaultFields)
	assert.True(t, resp.RequiresConfirm)
	assert.Contains(t, warningCodes(resp.Warnings), "publish.default_fields_json_only")
}

func TestBuildPublishDraftValidatesRequiredFields(t *testing.T) {
	_, err := BuildPublishDraft(view.PublishDraftRequest{
		SourceType: "kafka_json",
		Normalization: view.NormalizationDraft{
			BodyPath: "contents.content",
		},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "timePath")
}

func TestBuildPublishDraftWarnsWhenDefaultFieldMissing(t *testing.T) {
	resp, err := BuildPublishDraft(view.PublishDraftRequest{
		SourceType: "existing_table",
		Normalization: view.NormalizationDraft{
			TimePath:        "properties.produceTimestamp",
			BodyPath:        "body",
			TagPath:         "properties",
			RequiresConfirm: true,
		},
		QueryableFields: []view.QueryableField{
			{
				FieldKey:           "topic",
				Path:               "properties.topic",
				IsAccelerated:      true,
				AccelerationStatus: "materialized",
			},
		},
		DefaultFields: []string{"topic", "userId"},
	})
	require.NoError(t, err)
	assert.Contains(t, warningCodes(resp.Warnings), "publish.default_fields_missing")
}

func TestValidatePublishRequestRequiresTarget(t *testing.T) {
	err := validatePublishRequest(view.PublishRequest{
		SourceType: "kafka_json",
		Normalization: view.NormalizationDraft{
			TimePath: "time",
			BodyPath: "body",
		},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "target.instanceId")
}

func TestMapIndexMetadata(t *testing.T) {
	assert.Equal(t, db.IndexTypeString, mapIndexType(view.QueryValueTypeString))
	assert.Equal(t, 1, mapIndexType(view.QueryValueTypeNumber))
	assert.Equal(t, db.IndexKindBase, mapIndexKind(view.QueryFieldSourceColumn))
	assert.Equal(t, db.IndexKindLog, mapIndexKind(view.QueryFieldSourceJSONPath))
	assert.Equal(t, "contents.content", deriveRootName("contents.content.app"))
	assert.Equal(t, "", deriveRootName("app"))
}

func TestContainsDatabase(t *testing.T) {
	assert.True(t, containsDatabase([]*view.RespDatabaseSelfBuilt{{Name: "dev_log"}}, "dev_log"))
	assert.False(t, containsDatabase([]*view.RespDatabaseSelfBuilt{{Name: "prod_log"}}, "dev_log"))
}

func warningCodes(in []view.QueryWarning) []string {
	out := make([]string, 0, len(in))
	for _, item := range in {
		out = append(out, item.Code)
	}
	return out
}
