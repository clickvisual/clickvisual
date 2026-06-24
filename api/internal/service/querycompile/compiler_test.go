package querycompile

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestCompileUsesColumnExecutionForAcceleratedField(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:       "trace_id",
					DisplayName:    "trace_id",
					Source:         view.QueryFieldSourceColumn,
					Path:           "trace_id",
					ValueType:      view.QueryValueTypeString,
					IsAccelerated:  true,
					AcceleratedCol: "trace_id",
				},
				Operator: view.QueryOperatorEQ,
				Value:    "abc",
			},
		},
	}
	ctx := CompileContext{
		TableName:     "`default`.`logs`",
		TimeField:     "_time_second_",
		TimeFieldType: 0,
	}

	sql, plan, err := Compile(req, ctx)
	require.NoError(t, err)
	assert.Contains(t, sql, "`trace_id` = 'abc'")
	require.Len(t, plan.PlannedConditions, 1)
	assert.Equal(t, "column", plan.PlannedConditions[0].Execution)
}

func TestCompileUsesJSONPathExecutionForNonAcceleratedField(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:      "lv",
					DisplayName:   "lv",
					Source:        view.QueryFieldSourceJSONPath,
					Path:          "lv",
					ValueType:     view.QueryValueTypeString,
					IsAccelerated: false,
				},
				Operator: view.QueryOperatorContains,
				Value:    "debug",
			},
		},
	}
	ctx := CompileContext{
		TableName:     "`default`.`logs`",
		TimeField:     "_time_second_",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	}

	sql, plan, err := Compile(req, ctx)
	require.NoError(t, err)
	assert.Contains(t, sql, "JSONExtractString(_raw_log_, 'lv')")
	assert.Contains(t, sql, "LIKE '%debug%'")
	require.Len(t, plan.PlannedConditions, 1)
	assert.Equal(t, "json_path", plan.PlannedConditions[0].Execution)
	assert.True(t, plan.PlannedConditions[0].HighCost)
}

func TestCompileSupportsNestedJSONPath(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:      "body.lv",
					DisplayName:   "body.lv",
					Source:        view.QueryFieldSourceJSONPath,
					Path:          "contents.content.lv",
					ValueType:     view.QueryValueTypeString,
					IsAccelerated: false,
				},
				Operator: view.QueryOperatorEQ,
				Value:    "debug",
			},
		},
	}
	ctx := CompileContext{
		TableName:       "`default`.`logs`",
		TimeField:       "_time_second_",
		TimeFieldType:   0,
		RawJSONColumn:   "_raw_log_",
		NestedJSONPaths: map[string]string{"contents.content.lv": "contents.content"},
	}

	sql, plan, err := Compile(req, ctx)
	require.NoError(t, err)
	assert.Contains(t, sql, "JSONExtractString(JSONExtractRaw(_raw_log_, 'contents.content'), 'lv')")
	require.Len(t, plan.PlannedConditions, 1)
	assert.Equal(t, "json_path", plan.PlannedConditions[0].Execution)
}

func TestCompileRejectsInvalidOperatorForBooleanField(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:      "hidden",
					DisplayName:   "hidden",
					Source:        view.QueryFieldSourceJSONPath,
					Path:          "options.hideInRecentlyUsed",
					ValueType:     view.QueryValueTypeBoolean,
					IsAccelerated: false,
				},
				Operator: view.QueryOperatorContains,
				Value:    "true",
			},
		},
	}
	ctx := CompileContext{
		TableName:     "`default`.`logs`",
		TimeField:     "_time_second_",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	}

	_, _, err := Compile(req, ctx)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "operator")
}
