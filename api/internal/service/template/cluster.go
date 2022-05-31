package template

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type ClusterNoReplica struct {
	template
}

func NewClusterNoReplica(req view.ReqTemplateClusterNoReplica) IMP {
	return &Standalone{
		template{
			broker:          req.Brokers,
			cluster:         req.K8sClusterName,
			instanceCluster: req.InstanceClusterName,
			dsn:             req.Dsn,
			mode:            ClusterMode,
		},
	}
}
