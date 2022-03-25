package builder

import (
	"github.com/shimohq/mogo/api/internal/service/inquiry/builder/bumo"
)

type Builder interface {
	NewProject(params bumo.Params)
	BuilderCreate()
	BuilderFields()
	BuilderWhere()
	BuilderEngine()
	BuilderOrder()
	BuilderTTL()
	BuilderSetting()
	GetResult() interface{}
}

func Standalone(params bumo.Params, builder Builder) string {
	director := new(Director)
	director.SetBuilder(builder)
	obj := director.Generate(params)
	return obj.Gen()
}
