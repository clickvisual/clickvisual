package cluster

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/common"
)

// ViewBuilder stand-alone cluster version
type ViewBuilder struct {
	QueryAssembly *bumo.QueryAssembly
}

func (b *ViewBuilder) NewProject(params bumo.Params) {
	b.QueryAssembly = new(bumo.QueryAssembly)
	b.QueryAssembly.Params = params
}

func (b *ViewBuilder) BuilderCreate() {
	switch b.QueryAssembly.Params.View.ViewType {
	case bumo.ViewTypePrometheusMetric, bumo.ViewTypePrometheusMetricAggregation:
		b.QueryAssembly.Result += fmt.Sprintf("CREATE MATERIALIZED VIEW %s on cluster '%s' TO metrics.samples AS\n",
			b.QueryAssembly.Params.View.ViewTable,
			b.QueryAssembly.Params.Cluster)
	default:
		b.QueryAssembly.Result += fmt.Sprintf("CREATE MATERIALIZED VIEW %s on cluster '%s' TO %s AS\n",
			b.QueryAssembly.Params.View.ViewTable,
			b.QueryAssembly.Params.Cluster,
			b.QueryAssembly.Params.View.TargetTable)
	}
}

func (b *ViewBuilder) BuilderFields() {
	switch b.QueryAssembly.Params.View.ViewType {
	case bumo.ViewTypePrometheusMetric:
		b.QueryAssembly.Result += fmt.Sprintf(`SELECT
  toDate(%s) as date,
  '%s' as name,
  array(%s) as tags,
  toFloat64(count(*)) as val,
  %s as ts,
  toDateTime(%s) as updated
FROM %s
`,
			b.QueryAssembly.Params.TimeField,
			bumo.PrometheusMetricName,
			b.QueryAssembly.Params.View.CommonFields,
			b.QueryAssembly.Params.TimeField,
			b.QueryAssembly.Params.TimeField,
			b.QueryAssembly.Params.View.SourceTable)
	case bumo.ViewTypePrometheusMetricAggregation:
		b.QueryAssembly.Result += common.BuilderViewAlarmAggregationWith(b.QueryAssembly.Params)
	default:
		b.QueryAssembly.Result += common.BuilderFieldsView(b.QueryAssembly.Params.TableCreateType, b.QueryAssembly.Params.KafkaJsonMapping,
			b.QueryAssembly.Params.LogField,
			b.QueryAssembly.Params.View)
	}
}

func (b *ViewBuilder) BuilderWhere() {
	switch b.QueryAssembly.Params.View.ViewType {
	case bumo.ViewTypePrometheusMetric:
		b.QueryAssembly.Result += fmt.Sprintf("WHERE %s GROUP BY %s\n", b.QueryAssembly.Params.View.Where, b.QueryAssembly.Params.TimeField)
	case bumo.ViewTypePrometheusMetricAggregation:
		b.QueryAssembly.Result += fmt.Sprintf("GROUP BY %s\n", b.QueryAssembly.Params.TimeField)
	default:
		b.QueryAssembly.Result += fmt.Sprintf("WHERE %s\n", b.QueryAssembly.Params.View.Where)
	}
}

func (b *ViewBuilder) BuilderEngine() {}

func (b *ViewBuilder) BuilderOrder() {}

func (b *ViewBuilder) BuilderTTL() {}

func (b *ViewBuilder) BuilderSetting() {}

func (b *ViewBuilder) GetResult() interface{} { return b.QueryAssembly }
