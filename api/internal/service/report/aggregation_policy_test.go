package report

import (
	"testing"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/stretchr/testify/assert"
)

func TestValidateAggregationEligibilityAcceptsWhitelistedMetrics(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "error",
				Label: "Error",
				Where: "lv='error'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
					{Key: "custom", Label: "去重 Pod 数", Expression: "uniq(`k8s.pod.name`)"},
				},
			},
			{
				Key:   "debug",
				Label: "Debug",
				Where: "lv in ('debug','trace')",
				Metrics: []view.ReqReportMetric{
					{Key: "topn", Label: "TopN 容器", GroupBy: "container.name", Limit: 3},
				},
			},
		},
	})
	assert.NoError(t, err)
}

func TestValidateAggregationEligibilityRejectsLikeWhere(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "default",
				Where: "msg like '%repair-docs-init%'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
		},
	})
	assert.NoError(t, err)
}

func TestValidateAggregationEligibilityRejectsUnsupportedRawLogRegexp(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "default",
				Where: "_raw_log_ regexp 'error|warn'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
		},
	})
	assert.ErrorContains(t, err, "不支持 regexp/match")
}

func TestValidateAggregationEligibilityAllowsHighCostRawLogLike(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "default",
				Where: "_raw_log_ like '%error%'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
		},
	})
	assert.NoError(t, err)
	assert.True(t, isHighCostAggregationWhere("_raw_log_ like '%error%'"))
	assert.False(t, isHighCostAggregationWhere("msg like '%error%'"))
}

func TestValidateAggregationEligibilityRejectsUnsupportedCustomExpression(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "default",
				Where: "lv='debug'",
				Metrics: []view.ReqReportMetric{
					{Key: "custom", Label: "复杂表达式", Expression: "sum(if(status > 500, 1, 0))"},
				},
			},
		},
	})
	assert.ErrorContains(t, err, "仅支持 count(*)、sum(field)、uniq(field)、avg(field)")
}

func TestValidateAggregationEligibilityRejectsMultipleTopNGroupBy(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "error",
				Where: "lv='error'",
				Metrics: []view.ReqReportMetric{
					{Key: "topn", Label: "容器排行", GroupBy: "container.name", Limit: 3},
				},
			},
			{
				Key:   "debug",
				Where: "lv='debug'",
				Metrics: []view.ReqReportMetric{
					{Key: "topn", Label: "主机排行", GroupBy: "host.name", Limit: 3},
				},
			},
		},
	})
	assert.ErrorContains(t, err, "只允许一种 TopN 分组字段")
}

func TestValidateAggregationEligibilityAcceptsFileGuidTopN(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "repair_v2",
				Label: "触发 v2 版本修复统计",
				Where: "msg='repair-docs-init'",
				Metrics: []view.ReqReportMetric{
					{Key: "topn", Label: "文件列表", GroupBy: "fileGuid", Limit: 10},
				},
			},
		},
	})
	assert.NoError(t, err)
}

func TestValidateAggregationEligibilityAcceptsMethodWhere(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "gray_read",
				Label: "灰度读",
				Where: "method='docGrayProxy' and msg='writeModeDocv2grayRead'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
		},
	})
	assert.NoError(t, err)
}

func TestValidateAggregationEligibilityAcceptsNamespaceWhere(t *testing.T) {
	err := validateAggregationEligibility(view.ReqReportBuilder{
		Database:  "dev_log",
		Table:     "app_stdout",
		TimeField: "_time_second_",
		TimeRange: "1h",
		Blocks: []view.ReqReportBlock{
			{
				Key:   "default_namespace",
				Label: "默认命名空间",
				Where: "_namespace_='default'",
				Metrics: []view.ReqReportMetric{
					{Key: "count", Label: "总量"},
				},
			},
		},
	})
	assert.NoError(t, err)
}

func TestAggregationAllowedFieldsMergesConfiguredFields(t *testing.T) {
	fields := aggregationAllowedFields([]string{" custom.field ", "`another_field`"})

	_, hasDefault := fields["lv"]
	_, hasCustom := fields["custom.field"]
	_, hasAnother := fields["another_field"]

	assert.True(t, hasDefault)
	assert.True(t, hasCustom)
	assert.True(t, hasAnother)
}

func TestAggregationAllowedGroupByFieldsMergesConfiguredFields(t *testing.T) {
	fields := aggregationAllowedGroupByFields([]string{" `service.name` "})

	_, hasDefault := fields["container.name"]
	_, hasConfigured := fields["service.name"]

	assert.True(t, hasDefault)
	assert.True(t, hasConfigured)
}
