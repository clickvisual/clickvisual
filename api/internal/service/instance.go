package service

import (
	"database/sql"
	"strconv"
	"strings"
	"sync"

	"github.com/ClickHouse/clickhouse-go"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/internal/service/inquiry"
	"github.com/shimohq/mogo/api/pkg/constx"
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
				invoker.Logger.Error("ClickHouse", elog.Any("step", "ClickHouseLink"), elog.Any("error", err.Error()))
				continue
			}
			m.dss.Store(ds.DsKey(), inquiry.NewClickHouse(chDb, ds))
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
			invoker.Logger.Error("ClickHouse", elog.Any("step", "ClickHouseLink"), elog.Any("error", err.Error()))
			return err
		}
		i.dss.Store(obj.DsKey(), inquiry.NewClickHouse(chDb, obj))
	}
	return nil
}

func (i *instanceManager) Load(id int) (inquiry.Operator, error) {
	instance, err := db.InstanceInfo(invoker.Db, id)
	if err != nil {
		invoker.Logger.Error("instanceManager", elog.Any("id", id), elog.Any("error", err.Error()))
		return nil, err
	}
	obj, ok := i.dss.Load(db.InstanceKey(id))
	if !ok {
		// try again
		if err = i.Add(&instance); err != nil {
			return nil, constx.ErrInstanceObj
		}
		obj, _ = i.dss.Load(db.InstanceKey(id))
	}
	if obj == nil {
		return nil, constx.ErrInstanceObj
	}
	switch instance.Datasource {
	case db.DatasourceClickHouse:
		return obj.(*inquiry.ClickHouse), nil
	}
	return nil, constx.ErrInstanceObj
}

func (i *instanceManager) All() []inquiry.Operator {
	res := make([]inquiry.Operator, 0)
	i.dss.Range(func(key, obj interface{}) bool {
		iid, _ := strconv.Atoi(key.(string))
		instance, _ := db.InstanceInfo(invoker.Db, iid)
		if instance.Datasource == db.DatasourceClickHouse {
			res = append(res, obj.(*inquiry.ClickHouse))
		}
		return true
	})
	return res
}

func clickHouseLink(dsn string) (db *sql.DB, err error) {
	if strings.Contains(dsn, "?") {
		dsn = dsn + "&max_execution_time=60"
	}
	db, err = sql.Open("clickhouse", dsn)
	if err != nil {
		invoker.Logger.Error("ClickHouse", elog.Any("step", "sql.error"), elog.String("error", err.Error()))
		return
	}
	if err = db.Ping(); err != nil {
		if exception, ok := err.(*clickhouse.Exception); ok {
			invoker.Logger.Error("ClickHouse", elog.String("step", "exception"), elog.Any("Code", exception.Code), elog.Any("Message", exception.Message), elog.Any("StackTrace", exception.StackTrace))
		} else {
			invoker.Logger.Error("ClickHouse", elog.String("step", "notException"), elog.Any("error", err.Error()))
		}
		return
	}
	db.SetMaxIdleConns(100)
	db.SetMaxOpenConns(50)
	return
}
