package standalone

import (
	"fmt"

	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
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
	b.QueryAssembly.Create = fmt.Sprintf("CREATE MATERIALIZED VIEW %s TO %s AS\n", b.QueryAssembly.Params.ViewTable, b.QueryAssembly.Params.TargetTable)
}

func (b *ViewBuilder) BuilderFields() {
	b.QueryAssembly.Fields = fmt.Sprintf(`SELECT
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
`, b.QueryAssembly.Params.TimeField, b.QueryAssembly.Params.CommonFields, b.QueryAssembly.Params.SourceTable)
}

func (b *ViewBuilder) BuilderWhere() {
	b.QueryAssembly.Where = fmt.Sprintf("WHERE %s\n", b.QueryAssembly.Params.Where)
}

func (b *ViewBuilder) BuilderEngine() {}

func (b *ViewBuilder) BuilderOrder() {}

func (b *ViewBuilder) BuilderTTL() {}

func (b *ViewBuilder) BuilderSetting() {}

func (b *ViewBuilder) GetResult() interface{} { return b.QueryAssembly }
