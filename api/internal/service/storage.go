package service

import (
	"time"

	"github.com/ego-component/egorm"
	"go.uber.org/multierr"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/storage"
	"github.com/clickvisual/clickvisual/api/internal/service/storage/storageworker"
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
	list, err := db2.TableList(invoker.Db, conds)
	if err != nil {
		return err
	}
	for _, row := range list {
		if row.V3TableType == db2.V3TableTypeJaegerJSON {
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

func (s *srvStorage) on(row *db2.BaseTable) error {
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
	target.SetTable(row.Name + db2.SuffixJaegerJSON)
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

func (s *srvStorage) off(row *db2.BaseTable) {
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

func (s *srvStorage) CreateByILogtailTemplate(uid int, databaseInfo db2.BaseDatabase, param view.ReqCreateStorageByTemplateILogtail) (err error) {
	cp := view.ReqStorageCreate{
		CreateType:              constx.TableCreateTypeJSONAsString,
		Typ:                     2,
		Days:                    param.Days,
		Brokers:                 param.Brokers,
		Consumers:               1,
		KafkaSkipBrokenMessages: 1000,
		Source: `{
    "contents": {
        "content": "{\"lv\":\"debug\",\"ts\":1681704437,\"msg\":\"presigned get object URL\"}"
    },
    "tags": {  
        "container.image.name": "xxx",
        "container.ip": "127.0.0.1",
        "container.name": "xx-xx",
        "host.ip": "127.0.0.1",
        "host.name": "xx-xx-xx",
        "log.file.path": "xx-xx-xx",
        "k8s.namespace.name": "default",
        "k8s.node.ip": "127.0.0.1",
        "k8s.node.name": "127.0.0.1",
        "k8s.pod.name": "xx-xx-xx-xx",
        "k8s.pod.uid": "xx-xx-xx-xx-xx"
    },
    "time": 1681704438
}`,
		DatabaseId:        databaseInfo.ID,
		TimeField:         "time",
		TimeFieldParent:   "",
		RawLogField:       "content",
		RawLogFieldParent: "contents",
	}
	cp.Topics = param.Topic
	cp.TableName = param.Name
	if err = s.createByIlogtailTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}
	return
}

func (s *srvStorage) CreateByEgoTemplate(uid int, databaseInfo db2.BaseDatabase, param view.ReqCreateStorageByTemplateEgo) (err error) {
	cp := view.ReqStorageCreate{
		CreateType:              constx.TableCreateTypeJSONAsString,
		Typ:                     1,
		Days:                    3,
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
        "log.file.path": "xx-xx-xx",
        "k8s.namespace.name": "default",
        "k8s.node.ip": "127.0.0.1",
        "k8s.node.name": "127.0.0.1",
        "k8s.pod.name": "xx-xx-xx-xx",
        "k8s.pod.uid": "xx-xx-xx-xx-xx"
    },
    "time": 1681704438
}`,
		DatabaseId:        databaseInfo.ID,
		TimeField:         "_time_",
		TimeFieldParent:   "contents",
		RawLogField:       "content",
		RawLogFieldParent: "contents",
	}
	cp.Topics = param.TopicsApp
	cp.TableName = "app_stdout"
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}

	// cp.Topics = param.TopicsEgo
	// cp.TableName = "ego_stdout"
	// if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
	// 	return err
	// }

	cp.Topics = param.TopicsIngressStdout
	cp.TableName = "ingress_stdout"
	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
		return err
	}

// 	cp.Topics = param.TopicsIngressStderr
// 	cp.TableName = "ingress_stderr"
// 	cp.Source = `{
//     "contents": {
//         "_source_": "stderr",
//         "_time_": "2023-04-17T04:07:17.624075074Z",
//         "content": "abc123...asfa"
//     },
//     "tags": {  
//         "container.image.name": "xxx",
//         "container.ip": "127.0.0.1",
//         "container.name": "xx-xx",
//         "host.ip": "127.0.0.1",
//         "host.name": "xx-xx-xx",
//         "log.file.path": "xx-xx-xx",
//         "k8s.namespace.name": "default",
//         "k8s.node.ip": "127.0.0.1",
//         "k8s.node.name": "127.0.0.1",
//         "k8s.pod.name": "xx-xx-xx-xx",
//         "k8s.pod.uid": "xx-xx-xx-xx-xx"
//     },
//     "time": 1681704438
// }`
// 	if err = s.createByEgoTemplateItem(uid, databaseInfo, cp); err != nil {
// 		return err
// 	}
	return
}

func (s *srvStorage) createByIlogtailTemplateItem(uid int, databaseInfo db2.BaseDatabase, param view.ReqStorageCreate) (err error) {
	// Detection is whether it has been created
	conds := egorm.Conds{}
	conds["did"] = databaseInfo.ID
	conds["name"] = param.TableName
	tableInfo, _ := db2.TableInfoX(invoker.Db, conds)
	if tableInfo.ID != 0 {
		return nil
	}
	_, err = StorageCreate(uid, databaseInfo, param)
	if err != nil {
		return
	}
	return nil
}

func (s *srvStorage) createByEgoTemplateItem(uid int, databaseInfo db2.BaseDatabase, param view.ReqStorageCreate) (err error) {
	// Detection is whether it has been created
	conds := egorm.Conds{}
	conds["did"] = databaseInfo.ID
	conds["name"] = param.TableName
	tableInfo, _ := db2.TableInfoX(invoker.Db, conds)
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
