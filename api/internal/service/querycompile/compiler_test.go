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

func TestCompileFieldStatsUsesConfiguredRawColumnForJSONKey(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Tid: 1,
			ST:  1710000000,
			ET:  1710003600,
		},
		Field: view.QueryFieldRef{
			FieldKey:      "city",
			DisplayName:   "city",
			Source:        view.QueryFieldSourceJSONPath,
			Path:          "city",
			ValueType:     view.QueryValueTypeString,
			IsAccelerated: false,
		},
		Limit: 10,
	}

	statsSQL, totalSQL, _, err := CompileFieldStats(req, CompileContext{
		TableName:     "`bigdata`.`web_events_all`",
		TimeField:     "ts",
		TimeFieldType: 0,
		RawJSONColumn: "body",
	})

	require.NoError(t, err)
	assert.Contains(t, statsSQL, "JSONExtractString(body, 'city')")
	assert.Contains(t, totalSQL, "JSONExtractString(body, 'city')")
	assert.NotContains(t, statsSQL, "_raw_log_")
	assert.NotContains(t, totalSQL, "_raw_log_")
}

func TestCompileFieldStatsMapsJSONPathTimeFieldToColumn(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Tid: 1,
			ST:  1710000000,
			ET:  1710003600,
		},
		Field: view.QueryFieldRef{
			FieldKey:      "ts",
			DisplayName:   "ts",
			Source:        view.QueryFieldSourceJSONPath,
			Path:          "ts",
			ValueType:     view.QueryValueTypeString,
			IsAccelerated: false,
		},
		Limit: 10,
	}

	statsSQL, totalSQL, _, err := CompileFieldStats(req, CompileContext{
		TableName:     "`metrics`.`samples`",
		TimeField:     "ts",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	})

	require.NoError(t, err)
	assert.Contains(t, statsSQL, "ifNull(toString(ts), '') != ''")
	assert.Contains(t, totalSQL, "ifNull(toString(ts), '') != ''")
	assert.NotContains(t, statsSQL, "JSONExtractString(_raw_log_, 'ts')")
	assert.NotContains(t, totalSQL, "JSONExtractString(_raw_log_, 'ts')")
}

func TestCompileFieldStatsSupportsTagKeyValueArray(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Tid: 1,
			ST:  1710000000,
			ET:  1710003600,
		},
		Field: view.QueryFieldRef{
			FieldKey:      "tags.prometheus_replica",
			DisplayName:   "prometheus_replica",
			Source:        view.QueryFieldSourceTagPath,
			Path:          "tags.prometheus_replica",
			ValueType:     view.QueryValueTypeString,
			IsAccelerated: false,
		},
		Limit: 10,
	}

	statsSQL, totalSQL, plan, err := CompileFieldStats(req, CompileContext{
		TableName:     "`metrics`.`samples`",
		TimeField:     "ts",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	})

	require.NoError(t, err)
	assert.Contains(t, statsSQL, "extract(toString(`tags`), 'prometheus_replica=")
	assert.Contains(t, totalSQL, "extract(toString(`tags`), 'prometheus_replica=")
	assert.NotContains(t, statsSQL, "JSONExtractString(_raw_log_, 'prometheus_replica')")
	assert.NotContains(t, totalSQL, "JSONExtractString(_raw_log_, 'prometheus_replica')")
	require.Len(t, plan.PlannedConditions, 1)
	assert.Equal(t, "tag_path", plan.PlannedConditions[0].Execution)
}

func TestCompileFieldStatsSupportsKeyValueArrayFromAnyParentField(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Tid: 1,
			ST:  1710000000,
			ET:  1710003600,
		},
		Field: view.QueryFieldRef{
			FieldKey:      "labels.cluster",
			DisplayName:   "cluster",
			Source:        view.QueryFieldSourceTagPath,
			Path:          "labels.cluster",
			ValueType:     view.QueryValueTypeString,
			IsAccelerated: false,
		},
		Limit: 10,
	}

	statsSQL, _, _, err := CompileFieldStats(req, CompileContext{
		TableName:     "`metrics`.`samples`",
		TimeField:     "ts",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	})

	require.NoError(t, err)
	assert.Contains(t, statsSQL, "extract(toString(`labels`), 'cluster=")
	assert.NotContains(t, statsSQL, "`tags`")
}

func TestCompileRawLogContainsMatchesEscapedJSONQuotes(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:       "_raw_log_",
					DisplayName:    "全局匹配",
					Source:         view.QueryFieldSourceColumn,
					Path:           "_raw_log_",
					ValueType:      view.QueryValueTypeString,
					IsAccelerated:  true,
					AcceleratedCol: "_raw_log_",
				},
				Operator: view.QueryOperatorContains,
				Value:    `sum(container_fs_usage_bytes{namespace="sdk-open"})`,
			},
		},
	}
	ctx := CompileContext{
		TableName:     "`default`.`logs`",
		TimeField:     "_time_second_",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	}

	sql, _, err := Compile(req, ctx)
	require.NoError(t, err)
	assert.Contains(t, sql, "_raw_log_ LIKE '%sum(container_fs_usage_bytes{namespace=\"sdk-open\"})%'")
	assert.Contains(t, sql, "_raw_log_ LIKE '%sum(container_fs_usage_bytes{namespace=\\\\\"sdk-open\\\\\"})%'")
}

func TestCompileRawLogLogicalFieldUsesConfiguredRawColumn(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:       "_raw_log_",
					DisplayName:    "全局匹配",
					Source:         view.QueryFieldSourceColumn,
					Path:           "_raw_log_",
					ValueType:      view.QueryValueTypeString,
					IsAccelerated:  true,
					AcceleratedCol: "_raw_log_",
				},
				Operator: view.QueryOperatorContains,
				Value:    "Beijing",
			},
		},
	}
	ctx := CompileContext{
		TableName:     "`bigdata`.`web_events_all`",
		TimeField:     "ts",
		TimeFieldType: 0,
		RawJSONColumn: "body",
	}

	sql, _, err := Compile(req, ctx)
	require.NoError(t, err)
	assert.Contains(t, sql, "body LIKE '%Beijing%'")
	assert.NotContains(t, sql, "_raw_log_ LIKE")
}

func TestCompileRawLogLogicalFieldRequiresConfiguredRawColumn(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
		Conditions: []view.QueryConditionV2{
			{
				Field: view.QueryFieldRef{
					FieldKey:       "_raw_log_",
					DisplayName:    "全局匹配",
					Source:         view.QueryFieldSourceColumn,
					Path:           "_raw_log_",
					ValueType:      view.QueryValueTypeString,
					IsAccelerated:  true,
					AcceleratedCol: "_raw_log_",
				},
				Operator: view.QueryOperatorContains,
				Value:    "info",
			},
		},
	}
	_, _, err := Compile(req, CompileContext{
		TableName:                "`metrics`.`samples`",
		TimeField:                "ts",
		TimeFieldType:            0,
		RawJSONColumnUnavailable: true,
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "未配置日志内容字段")
}

func TestCompileNormalizesLogLevelEquality(t *testing.T) {
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
				Operator: view.QueryOperatorEQ,
				Value:    "warn",
			},
		},
	}

	sql, _, err := Compile(req, CompileContext{
		TableName:     "`default`.`logs`",
		TimeField:     "_time_second_",
		RawJSONColumn: "_raw_log_",
	})

	require.NoError(t, err)
	assert.Contains(t, sql, "lowerUTF8(replaceRegexpAll(JSONExtractString(_raw_log_, 'lv')")
	assert.Contains(t, sql, "= 'warn'")
}

func TestCompileNormalizesLogLevelColumnEquality(t *testing.T) {
	req := view.QueryRequestV2{
		Tid: 1,
		ST:  1710000000,
		ET:  1710003600,
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
				Value:    "WARN",
			},
		},
	}

	sql, _, err := Compile(req, CompileContext{
		TableName: "`default`.`logs`",
		TimeField: "_time_second_",
	})

	require.NoError(t, err)
	assert.Contains(t, sql, "lowerUTF8(replaceRegexpAll(`lv`")
	assert.NotContains(t, sql, "JSONExtractString(_raw_log_, 'lv')")
	assert.Contains(t, sql, "= 'warn'")
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

func TestCompileFieldStatsUsesCurrentFilters(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Tid: 1,
			ST:  1710000000,
			ET:  1710003600,
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
					Value:    "error",
				},
			},
		},
		Field: view.QueryFieldRef{
			FieldKey:       "container.name",
			DisplayName:    "container.name",
			Source:         view.QueryFieldSourceColumn,
			Path:           "container.name",
			ValueType:      view.QueryValueTypeString,
			IsAccelerated:  true,
			AcceleratedCol: "container.name",
		},
		Limit: 5,
	}

	statsSQL, totalSQL, plan, err := CompileFieldStats(req, CompileContext{
		TableName:     "`dev_log`.`app_stdout`",
		TimeField:     "_time_second_",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	})

	require.NoError(t, err)
	assert.Contains(t, statsSQL, "_time_second_ >= toDateTime(1710000000)")
	assert.Contains(t, statsSQL, "lowerUTF8(replaceRegexpAll(`lv`")
	assert.Contains(t, statsSQL, "= 'error'")
	assert.Contains(t, statsSQL, "ifNull(toString(`container.name`), '') != ''")
	assert.Contains(t, statsSQL, "GROUP BY field_value")
	assert.Contains(t, statsSQL, "LIMIT 5")
	assert.Contains(t, totalSQL, "SELECT count() AS count")
	require.Len(t, plan.PlannedConditions, 2)
	assert.Equal(t, "container.name", plan.PlannedConditions[1].FieldKey)
}

func TestCompileFieldStatsSupportsRawLogJSONKey(t *testing.T) {
	req := view.QueryFieldStatsRequest{
		QueryRequestV2: view.QueryRequestV2{
			Tid: 1,
			ST:  1710000000,
			ET:  1710003600,
		},
		Field: view.QueryFieldRef{
			FieldKey:      "msg",
			DisplayName:   "msg",
			Source:        view.QueryFieldSourceJSONPath,
			Path:          "msg",
			ValueType:     view.QueryValueTypeString,
			IsAccelerated: false,
		},
		Limit: 10,
	}

	statsSQL, totalSQL, plan, err := CompileFieldStats(req, CompileContext{
		TableName:     "`dev_log`.`app_stdout`",
		TimeField:     "_time_second_",
		TimeFieldType: 0,
		RawJSONColumn: "_raw_log_",
	})

	require.NoError(t, err)
	assert.Contains(t, statsSQL, "JSONExtractString(_raw_log_, 'msg')")
	assert.Contains(t, statsSQL, "GROUP BY field_value")
	assert.Contains(t, statsSQL, "ORDER BY count DESC")
	assert.Contains(t, totalSQL, "JSONExtractString(_raw_log_, 'msg')")
	require.Len(t, plan.PlannedConditions, 1)
	assert.Equal(t, "msg", plan.PlannedConditions[0].FieldKey)
	assert.Equal(t, "json_path", plan.PlannedConditions[0].Execution)
	assert.True(t, plan.PlannedConditions[0].HighCost)
}
