package template

import (
	"fmt"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type IMP interface {
	CreateInstance() (db.BaseInstance, error)
	CreateDatabase(iid int) (db.BaseDatabase, error)
	CreateTable(database db.BaseDatabase) error
}

const (
	ClusterMode    = 1
	StandaloneMode = 2
)

type template struct {
	broker  string
	cluster string
	dsn     string
	mode    int

	// cluster mode without replica
	instanceCluster string
}

func (t *template) CreateInstance() (ins db.BaseInstance, err error) {

	switch t.mode {
	case ClusterMode:
		// create instance
		ins, err = service.InstanceCreate(view.ReqCreateInstance{
			Datasource:    "ch",
			Name:          "clickvisual_default",
			Dsn:           t.dsn,
			Clusters:      []string{t.instanceCluster},
			Mode:          1,
			ReplicaStatus: 1,
		})
	case StandaloneMode:
		// create instance
		ins, err = service.InstanceCreate(view.ReqCreateInstance{
			Datasource: "ch",
			Name:       "clickvisual_default",
			Dsn:        t.dsn,
		})
	}

	if err != nil {
		elog.Error("templateOne", elog.String("step", "InstanceCreate"), elog.Any("err", err.Error()))
		return
	}
	return
}

func (t *template) CreateDatabase(iid int) (database db.BaseDatabase, err error) {
	switch t.mode {
	case ClusterMode:
		// create database
		database, err = service.DatabaseCreate(db.BaseDatabase{
			Iid:          iid,
			Name:         "clickvisual_default",
			Uid:          1,
			IsCreateByCV: 1,
			Cluster:      t.instanceCluster,
		})
	case StandaloneMode:
		// create database
		database, err = service.DatabaseCreate(db.BaseDatabase{
			Iid:          iid,
			Name:         "clickvisual_default",
			Uid:          1,
			IsCreateByCV: 1,
		})
	}

	if err != nil {
		elog.Error("templateOne", elog.String("step", "CreateDatabase"), elog.Any("err", err.Error()))
		return
	}
	return
}

func (t *template) CreateTable(database db.BaseDatabase) error {
	// create table
	// app-stdout, ego-stdout, ingress-stdout, ingress-stderr
	for tableName, analysisFields := range templateOneTable {
		table, errTableCreate := service.TableCreate(1, database, view.ReqTableCreate{
			TableName: tableName,
			Typ:       1,
			Days:      7,
			Brokers:   t.broker,
			Topics:    fmt.Sprintf(kafkaTopicORM[tableName], t.cluster),
			Consumers: 1,
		})
		if errTableCreate != nil {
			elog.Error("templateOne", elog.String("step", "errTableCreate"), elog.Any("err", errTableCreate.Error()))
			return errTableCreate
		}
		errAnalysisFieldsUpdate := service.AnalysisFieldsUpdate(table.ID, analysisFields)
		if errAnalysisFieldsUpdate != nil {
			elog.Error("templateOne", elog.String("step", "AnalysisFieldsUpdate"), elog.Any("err", errAnalysisFieldsUpdate.Error()))
			return errAnalysisFieldsUpdate
		}
	}
	return nil
}
