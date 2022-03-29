package view

type ReqCreateInstance struct {
	Datasource       string `json:"datasource" binding:"required"`
	Name             string `json:"name" binding:"required"`
	Dsn              string `json:"dsn" binding:"required"`
	RuleStoreType    int    `json:"ruleStoreType"`
	FilePath         string `json:"filePath"`
	ClusterId        int    `json:"clusterId"`
	Namespace        string `json:"namespace"`
	Configmap        string `json:"configmap"`
	PrometheusTarget string `json:"prometheusTarget"`

	Mode     int      `json:"mode"`
	Clusters []string `json:"clusters"`
}

type ReqCreateCluster struct {
	Name        string `json:"clusterName"`
	Description string `json:"description"`
	Status      int    `json:"status"`
	ApiServer   string `json:"apiServer"`
	KubeConfig  string `json:"kubeConfig"`
}
