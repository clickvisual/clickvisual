package builder

import (
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
)

type Director struct {
	builder Builder
}

func (d *Director) SetBuilder(builder Builder) {
	d.builder = builder
}

func (d *Director) Generate(params bumo.Params) *bumo.QueryAssembly {
	d.builder.NewProject(params)
	d.builder.BuilderCreate()
	d.builder.BuilderFields()
	d.builder.BuilderEngine()
	d.builder.BuilderOrder()
	d.builder.BuilderTTL()
	d.builder.BuilderSetting()
	return d.builder.GetResult().(*bumo.QueryAssembly)
}
