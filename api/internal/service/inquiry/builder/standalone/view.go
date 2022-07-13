package standalone

import (
	"fmt"

	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
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
		b.QueryAssembly.Result += fmt.Sprintf("CREATE MATERIALIZED VIEW %s TO metrics.samples AS\n", b.QueryAssembly.Params.View.ViewTable)
	default:
		b.QueryAssembly.Result += fmt.Sprintf("CREATE MATERIALIZED VIEW %s TO %s AS\n", b.QueryAssembly.Params.View.ViewTable, b.QueryAssembly.Params.View.TargetTable)
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
			b.QueryAssembly.Params.View.TimeField,
			bumo.PrometheusMetricName,
			b.QueryAssembly.Params.View.CommonFields,
			b.QueryAssembly.Params.View.TimeField,
			b.QueryAssembly.Params.View.TimeField,
			b.QueryAssembly.Params.View.SourceTable)
	case bumo.ViewTypePrometheusMetricAggregation:
		b.QueryAssembly.Result += fmt.Sprintf(`with(
%s
) as limbo 
SELECT
  toDate(%s) as date,
  '%s' as name,
  array(%s) as tags,
  toFloat64(limbo.1) as val,
  %s as ts,
  toDateTime(%s) as updated
FROM %s
`,
			b.QueryAssembly.Params.View.WithSQL,
			b.QueryAssembly.Params.View.TimeField,
			bumo.PrometheusMetricName,
			b.QueryAssembly.Params.View.CommonFields,
			b.QueryAssembly.Params.View.TimeField,
			b.QueryAssembly.Params.View.TimeField,
			b.QueryAssembly.Params.View.SourceTable)
	default:
		b.QueryAssembly.Result += fmt.Sprintf(`SELECT
  %s,
  _source_,
  _cluster_,
  _log_agent_,
  _namespace_,
  _node_name_,
  _node_ip_,
  _container_name_,
  _pod_name_,
  _log_ AS _raw_log_%s
FROM %s
`, b.QueryAssembly.Params.View.TimeField, b.QueryAssembly.Params.View.CommonFields, b.QueryAssembly.Params.View.SourceTable)
	}
}

func (b *ViewBuilder) BuilderWhere() {
	switch b.QueryAssembly.Params.View.ViewType {
	case bumo.ViewTypePrometheusMetric:
		b.QueryAssembly.Result += fmt.Sprintf("WHERE %s GROUP BY %s\n", b.QueryAssembly.Params.View.Where, b.QueryAssembly.Params.View.TimeField)
	case bumo.ViewTypePrometheusMetricAggregation:
		b.QueryAssembly.Result += fmt.Sprintf("GROUP BY %s\n", b.QueryAssembly.Params.View.TimeField)
	default:
		b.QueryAssembly.Result += fmt.Sprintf("WHERE %s\n", b.QueryAssembly.Params.View.Where)
	}
}

func (b *ViewBuilder) BuilderEngine() {}

func (b *ViewBuilder) BuilderOrder() {}

func (b *ViewBuilder) BuilderTTL() {}

func (b *ViewBuilder) BuilderSetting() {}

func (b *ViewBuilder) GetResult() interface{} { return b.QueryAssembly }
