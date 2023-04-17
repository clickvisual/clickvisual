package service

import (
	"time"

	"github.com/ego-component/egorm"
	"go.uber.org/multierr"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/storage"
	"github.com/clickvisual/clickvisual/api/internal/service/storage/storageworker"
	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// type iSrvStorage interface {
// 	CreateByEgoTemplate(uid int, databaseInfo db.BaseDatabase, param view.ReqCreateStorageByTemplateEgo) (err error)
// }

type srvStorage struct {
	workersF map[int]bool
	workers  map[int]*storageworker.Trace
}

func NewSrvStorage() *srvStorage {
	return &srvStorage{
		workersF: make(map[int]bool, 0),
		workers:  make(map[int]*storageworker.Trace, 0),
	}
}

func (s *srvStorage) tickerTraceWorker() {
	ticker := time.NewTicker(time.Second * 10)
	defer ticker.Stop()
	for range ticker.C {
		core.LoggerError("srvStorage", "tickerTraceWorker", s.syncTraceWorker())
	}
}

func (s *srvStorage) syncTraceWorker() error {
	// 获取链路表的数据
	conds := egorm.Conds{}
	conds["create_type"] = constx.TableCreateTypeUBW
	list, err := db.TableList(invoker.Db, conds)
	if err != nil {
		return err
	}
	for _, row := range list {
		if row.V3TableType == db.V3TableTypeJaegerJSON {
			errRow := s.on(row)
			if errRow != nil {
				err = multierr.Append(err, err)
			}
		} else {
			s.off(row)
		}
	}
	return err
}

func (s *srvStorage) on(row *db.BaseTable) error {
	flag, ok := s.workersF[row.ID]
	if ok && flag {
		return nil
	}
	s.workersF[row.ID] = true
	// source table
	source := storage.Datasource{}
	source.SetDatabase(row.Database.Name)
	source.SetTable(row.Name)
	// target table
	target := storage.Datasource{}
	target.SetDatabase(row.Database.Name)
	target.SetTable(row.Name + db.SuffixJaegerJSON)
	// params
	op, err := InstanceManager.Load(row.Database.Iid)
	if err != nil {
		s.workersF[row.ID] = false
		return err
	}
	worker := storageworker.NewTrace(storageworker.WorkerParams{
		Spec:   "*/10 * * * *",
		Source: source,
		Target: target,
		DB:     op.Conn(),
	})
	s.workers[row.ID] = worker
	return nil
}

func (s *srvStorage) off(row *db.BaseTable) {
	flag, ok := s.workersF[row.ID]
	if !ok || !flag {
		return
	}
	w := s.workers[row.ID]
	if w != nil {
		w.Stop()
	}
}

func (s *srvStorage) stop() {
	for _, w := range s.workers {
		if w != nil {
			w.Stop()
		}
	}
}

func (s *srvStorage) CreateByILogtailTemplate(uid int, databaseInfo db.BaseDatabase, param view.ReqCreateStorageByTemplateILogtail) (err error) {
	cp := view.ReqStorageCreate{
		Typ:                     1,
		Days:                    14,
		Brokers:                 param.Brokers,
		Consumers:               1,
		KafkaSkipBrokenMessages: 1000,
		Source: `{
    "contents": {
        "_source_": "stderr",
        "_time_": "2023-04-17T04:07:17.624075074Z",
        "content": "{\"lv\":\"debug\",\"ts\":1681704437,\"msg\":\"presigned get object URL\"}"
    },
    "tags": {  
        "container.image.name": "xxx",
        "container.ip": "127.0.0.1",
        "container.name": "xx-xx",
        "host.ip": "127.0.0.1",
        "host.name": "xx-xx-xx",
        "k8s.namespace.name": "default",
        "k8s.node.ip": "127.0.0.1",
        "k8s.node.name": "127.0.0.1",
        "k8s.pod.name": "xx-xx-xx-xx",
        "k8s.pod.uid": "xx-xx-xx-xx-xx"
    },
    "time": 1681704438
}`,
		DatabaseId:  databaseInfo.ID,
		TimeField:   "JSONExtractString(JSONExtractRaw(_log,'contents'),'time')",
		RawLogField: "JSONExtractString(JSONExtractRaw(_log,'contents'),'content')",
	}
	cp.Topics = param.Topic
	cp.TableName = param.Name
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}
	return
}

func (s *srvStorage) CreateByEgoTemplate(uid int, databaseInfo db.BaseDatabase, param view.ReqCreateStorageByTemplateEgo) (err error) {
	cp := view.ReqStorageCreate{
		Typ:                     1,
		Days:                    14,
		Brokers:                 param.Brokers,
		Consumers:               1,
		KafkaSkipBrokenMessages: 1000,
		Source:                  `{"_time_":"2022-11-08T10:35:58.837927Z","_log_":"","_source_":"stdout","_pod_name_":"xx-x-xx","time":"xx-x-xx","_namespace_":"default","_node_name_":"xx-f.192.x.119.x","_container_name_":"xx","_cluster_":"xx","_log_agent_":"xx-b","_node_ip_":"192.1"}`,
		DatabaseId:              databaseInfo.ID,
		TimeField:               "_time_",
		RawLogField:             "_log_",
	}
	cp.Topics = param.TopicsApp
	cp.TableName = "app_stdout"
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}
	cp.Topics = param.TopicsEgo
	cp.TableName = "ego_stdout"
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}
	cp.Topics = param.TopicsIngressStdout
	cp.TableName = "ingress_stdout"
	cp.TimeField = "time"
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}
	cp.Topics = param.TopicsIngressStderr
	cp.TableName = "ingress_stderr"
	cp.TimeField = "time"
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}
	return
}

func (s *srvStorage) createByEgoTemplateItem(uid int, databaseInfo db.BaseDatabase, param view.ReqStorageCreate) (err error) {
	// Detection is whether it has been created
	conds := egorm.Conds{}
	conds["did"] = databaseInfo.ID
	conds["name"] = param.TableName
	tableInfo, _ := db.TableInfoX(invoker.Db, conds)
	if tableInfo.ID != 0 {
		return nil
	}
	table, err := StorageCreate(uid, databaseInfo, param)
	if err != nil {
		return
	}
	err = AnalysisFieldsUpdate(table.ID, templateTableAnalysisField[table.Name])
	if err != nil {
		return err
	}
	return nil
}
