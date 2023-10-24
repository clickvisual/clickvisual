package view

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

type RespNamespaceConfigmaps struct {
	Namespace  string          `json:"namespace"`
	Configmaps []RespConfigmap `json:"configmaps"`
}

type RespConfigmap struct {
	Name string `json:"configmapName"`
}

type ReqTestInstance struct {
	Datasource string `json:"datasource" binding:"required"`
	Dsn        string `json:"dsn" binding:"required"`
}

type ReqCreateInstance struct {
	Datasource       string `json:"datasource" binding:"required"`
	Name             string `json:"name" binding:"required"`
	Dsn              string `json:"dsn"`
	RuleStoreType    int    `json:"ruleStoreType"`
	FilePath         string `json:"filePath"`
	Desc             string `json:"desc"`
	ClusterId        int    `json:"clusterId"`
	Namespace        string `json:"namespace"`
	Configmap        string `json:"configmap"`
	PrometheusTarget string `json:"prometheusTarget"`
}

type Cluster struct {
	Cluster     string
	ShardNum    int
	ReplicaNum  int
	HostName    string
	HostAddress string
	Port        int
}

type ReqCreateCluster struct {
	Name        string `json:"clusterName"`
	Description string `json:"description"`
	Status      int    `json:"status"`
	ApiServer   string `json:"apiServer"`
	KubeConfig  string `json:"kubeConfig"`
}

type RespUserSimpleInfo struct {
	Uid      int    `json:"uid"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
	Phone    string `json:"phone"`
}

func (r *RespUserSimpleInfo) Gen(u db.User) {
	r.Uid = u.ID
	r.Username = u.Username
	r.Nickname = u.Nickname
	r.Email = u.Email
	r.Avatar = u.Avatar
}

type RespInstance struct {
	Id          int      `json:"id"`
	Name        string   `json:"name"`
	Clusters    []string `json:"clusters"`
	ClusterInfo []string `json:"clusterInfo"`
	Desc        string   `json:"desc"`
	Mode        int      `json:"mode"`
}
