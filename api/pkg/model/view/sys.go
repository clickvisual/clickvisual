package view

type ReqCreateInstance struct {
	Datasource string `json:"datasource"`
	Name       string `json:"instanceName"`
	Dsn        string `json:"dsn"`
}

type ReqCreateCluster struct {
	Name        string `json:"clusterName"`
	Description string `json:"description"`
	Status      int    `json:"status"`
	ApiServer   string `json:"apiServer"`
	KubeConfig  string `json:"kubeConfig"`
}
