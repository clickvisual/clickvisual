package template

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type Standalone struct {
	template
}

func NewStandalone(req view.ReqTemplateStandalone) IMP {
	return &Standalone{
		template{
			broker:  req.Brokers,
			cluster: req.ClusterName,
			dsn:     req.Dsn,
			mode:    StandaloneMode,
		},
	}
}
