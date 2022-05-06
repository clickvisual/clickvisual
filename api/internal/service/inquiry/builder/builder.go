package builder

import (
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
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

func Do(builder Builder, params bumo.Params) string {
	director := new(Director)
	director.SetBuilder(builder)
	obj := director.Generate(params)
	return obj.Gen()
}
