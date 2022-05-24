package view

type ReqTemplateOne struct {
	Dsn         string `json:"dsn" binding:"required"`
	ClusterName string `json:"clusterName" binding:"required"`
	Brokers     string `json:"brokers" binding:"required"`
}
