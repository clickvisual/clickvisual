package service

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"sync"

	"github.com/ClickHouse/clickhouse-go"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/service/inquiry"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

type instanceManager struct {
	dss sync.Map // datasource list
}

func NewInstanceManager() *instanceManager {
	m := &instanceManager{
		dss: sync.Map{},
	}
	datasourceList, _ := db.InstanceList(egorm.Conds{})
	for _, ds := range datasourceList {
		switch ds.Datasource {
		case db.DatasourceMySQL:
			// TODO Not supported at this time
		case db.DatasourceClickHouse:
			// Test connection, storage
			chDb, err := clickHouseLink(ds.Dsn)
			if err != nil {
				elog.Error("ClickHouse", elog.Any("step", "ClickHouseLink"), elog.Any("error", err.Error()))
				continue
			}
			m.dss.Store(ds.DsKey(), inquiry.NewClickHouse(chDb, ds.ID, ds.Name, ds.Datasource))
		}
	}
	return m
}

func (i *instanceManager) Delete(key string) {
	i.dss.Delete(key)
	return
}

func (i *instanceManager) Add(obj *db.Instance) error {
	switch obj.Datasource {
	case db.DatasourceClickHouse:
		// Test connection, storage
		chDb, err := clickHouseLink(obj.Dsn)
		if err != nil {
			elog.Error("ClickHouse", elog.Any("step", "ClickHouseLink"), elog.Any("error", err.Error()))
			return err
		}
		i.dss.Store(obj.DsKey(), inquiry.NewClickHouse(chDb, obj.ID, obj.Name, obj.Datasource))
	}
	return nil
}

func (i *instanceManager) Load(datasource, name string) inquiry.Operator {
	// Test connection, storage
	obj, _ := i.dss.Load(db.InstanceKey(datasource, name))
	if obj == nil {
		return nil
	}
	switch datasource {
	case db.DatasourceClickHouse:
		return obj.(*inquiry.ClickHouse)
	}
	return nil
}

func (i *instanceManager) All() []inquiry.Operator {
	res := make([]inquiry.Operator, 0)
	i.dss.Range(func(key, obj interface{}) bool {
		if strings.HasPrefix(key.(string), db.DatasourceClickHouse) {
			res = append(res, obj.(*inquiry.ClickHouse))
		}
		return true
	})
	return res
}

func clickHouseLink(dsn string) (db *sql.DB, err error) {
	db, err = sql.Open("clickhouse", dsn)
	if err != nil {
		log.Fatal(err)
	}
	elog.Debug("ClickHouse", elog.Any("step", "ch process"), elog.String("dsn", econf.GetString("clickhouse.dsn")))
	if err = db.Ping(); err != nil {
		elog.Debug("ClickHouse", elog.Any("step", "ch process 1"))
		if exception, ok := err.(*clickhouse.Exception); ok {
			elog.Debug("ClickHouse", elog.Any("step", "ch process 2"))
			fmt.Printf("[%d] %s \n%s\n", exception.Code, exception.Message, exception.StackTrace)
		} else {
			elog.Debug("ClickHouse", elog.Any("step", "ch process 3"))
			fmt.Println(err)
		}
		return
	}
	elog.Debug("ClickHouse", elog.Any("step", "ch finish"))
	return
}
