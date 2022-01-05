package view

type RespNamespaceConfigmaps struct {
	Namespace  string          `json:"namespace"`
	Configmaps []RespConfigmap `json:"configmaps"`
}

type RespConfigmap struct {
	Name string `json:"configmapName"`
}
