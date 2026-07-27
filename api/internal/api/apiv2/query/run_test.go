package query

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestRawLogFallbackRequestRewritesBusinessColumns(t *testing.T) {
	req := view.QueryRequestV2{
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:       "lv",
					DisplayName:    "lv",
					Source:         view.QueryFieldSourceColumn,
					Path:           "lv",
					ValueType:      view.QueryValueTypeString,
					IsAccelerated:  true,
					AcceleratedCol: "lv",
				},
				Operator: view.QueryOperatorEQ,
				Value:    "info",
			},
			{
				Field: view.QueryFieldRef{
					FieldKey:       "container.name",
					DisplayName:    "container.name",
					Source:         view.QueryFieldSourceColumn,
					Path:           "container.name",
					ValueType:      view.QueryValueTypeString,
					IsAccelerated:  true,
					AcceleratedCol: "container.name",
				},
				Operator: view.QueryOperatorEQ,
				Value:    "svc",
			},
			{
				Field: view.QueryFieldRef{
					FieldKey:       "_time_second_",
					DisplayName:    "_time_second_",
					Source:         view.QueryFieldSourceColumn,
					Path:           "_time_second_",
					ValueType:      view.QueryValueTypeDatetime,
					IsAccelerated:  true,
					AcceleratedCol: "_time_second_",
				},
				Operator: view.QueryOperatorEQ,
				Value:    "2026-06-08 10:00:00",
			},
		},
	}

	next, ok := rawLogFallbackRequest(req)

	assert.True(t, ok)
	assert.Equal(t, view.QueryFieldSourceJSONPath, next.Conditions[0].Field.Source)
	assert.Equal(t, "lv", next.Conditions[0].Field.Path)
	assert.False(t, next.Conditions[0].Field.IsAccelerated)
	assert.Empty(t, next.Conditions[0].Field.AcceleratedCol)
	assert.Equal(t, view.QueryFieldSourceJSONPath, next.Conditions[1].Field.Source)
	assert.Equal(t, "container.name", next.Conditions[1].Field.Path)
	assert.False(t, next.Conditions[1].Field.IsAccelerated)
	assert.Empty(t, next.Conditions[1].Field.AcceleratedCol)
	assert.Equal(t, view.QueryFieldSourceColumn, next.Conditions[2].Field.Source)
	assert.True(t, next.Conditions[2].Field.IsAccelerated)
}

func TestRawLogFieldStatsFallbackRequestRewritesFieldAndFilters(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Conditions: []view.QueryConditionV2{
				{
					Field: view.QueryFieldRef{
						FieldKey:       "status",
						DisplayName:    "status",
						Source:         view.QueryFieldSourceColumn,
						Path:           "status",
						ValueType:      view.QueryValueTypeNumber,
						IsAccelerated:  true,
						AcceleratedCol: "status",
					},
					Operator: view.QueryOperatorEQ,
					Value:    200,
				},
			},
		},
		Field: view.QueryFieldRef{
			FieldKey:       "step",
			DisplayName:    "step",
			Source:         view.QueryFieldSourceColumn,
			Path:           "step",
			ValueType:      view.QueryValueTypeString,
			IsAccelerated:  true,
			AcceleratedCol: "step",
		},
	}

	next, ok := rawLogFieldStatsFallbackRequest(req)

	assert.True(t, ok)
	assert.Equal(t, view.QueryFieldSourceJSONPath, next.Field.Source)
	assert.Equal(t, "step", next.Field.Path)
	assert.False(t, next.Field.IsAccelerated)
	assert.Equal(t, view.QueryFieldSourceJSONPath, next.Conditions[0].Field.Source)
	assert.Equal(t, "status", next.Conditions[0].Field.Path)
	assert.False(t, next.Conditions[0].Field.IsAccelerated)
}

func TestRawLogColumnForTableUsesStoredRawLogFieldOnlyForExistingTable(t *testing.T) {
	rawLogColumn, unavailable := rawLogColumnForTable(constx.TableCreateTypeExist, " body ", true, true)
	assert.Equal(t, "body", rawLogColumn)
	assert.False(t, unavailable)

	rawLogColumn, unavailable = rawLogColumnForTable(constx.TableCreateTypeExist, "", false, true)
	assert.Equal(t, "_raw_log_", rawLogColumn)
	assert.False(t, unavailable)

	rawLogColumn, unavailable = rawLogColumnForTable(constx.TableCreateTypeExist, "content", false, true)
	assert.Equal(t, "_raw_log_", rawLogColumn)
	assert.False(t, unavailable)

	rawLogColumn, unavailable = rawLogColumnForTable(constx.TableCreateTypeExist, "", false, false)
	assert.Empty(t, rawLogColumn)
	assert.True(t, unavailable)

	rawLogColumn, unavailable = rawLogColumnForTable(constx.TableCreateTypeJSONAsString, "content", false, false)
	assert.Equal(t, "_raw_log_", rawLogColumn)
	assert.False(t, unavailable)
}
