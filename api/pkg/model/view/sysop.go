package view

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

type RespNamespaceConfigmaps struct {
	Namespace  string          `json:"namespace"`
	Configmaps []RespConfigmap `json:"configmaps"`
}

type RespConfigmap struct {
	Name string `json:"configmapName"`
}

type ReqTestInstance struct {
	Datasource string `json:"datasource" default:"ch"`
	Dsn        string `json:"dsn" binding:"required"`
}

type ReqCreateInstance struct {
	Datasource       string     `json:"datasource" binding:"required"`
	Name             string     `json:"name" binding:"required"`
	Dsn              string     `json:"dsn" binding:"required"`
	RuleStoreType    int        `json:"ruleStoreType"`
	FilePath         string     `json:"filePath"`
	Desc             string     `json:"desc"`
	ClusterId        int        `json:"clusterId"`
	Namespace        string     `json:"namespace"`
	Configmap        string     `json:"configmap"`
	PrometheusTarget string     `json:"prometheusTarget"`
	Mode             int        `json:"mode"`
	ReplicaStatus    int        `json:"replicaStatus"`
	Clusters         db.Strings `json:"clusters"`
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
}

func (r *RespUserSimpleInfo) Gen(u db.User) {
	r.Uid = u.ID
	r.Username = u.Username
	r.Nickname = u.Nickname
	r.Email = u.Email
	r.Avatar = u.Avatar
}
