package view

type ReqTemplateStandalone struct {
	Dsn         string `json:"dsn" binding:"required"`
	ClusterName string `json:"clusterName" binding:"required"`
	Brokers     string `json:"brokers" binding:"required"`
}

type ReqTemplateClusterNoReplica struct {
	Dsn                 string `json:"dsn" binding:"required"`
	K8sClusterName      string `json:"k8sClusterName" binding:"required"`
	Brokers             string `json:"brokers" binding:"required"`
	InstanceClusterName string `json:"instanceClusterName" binding:"required"`
}
