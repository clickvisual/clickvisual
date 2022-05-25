package kube

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/cetus/pkg/kutl"
	"github.com/gotomicro/cetus/pkg/xgo"
	"github.com/gotomicro/ego/core/elog"
	"go.uber.org/zap"

	"k8s.io/client-go/rest"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

const (
	// High enough QPS to fit all expected use cases.
	defaultQPS = 1e6
	// High enough Burst to fit all expected use cases.
	defaultBurst = 1e6
	// full resyc cache resource time
	defaultResyncPeriod = 30 * time.Second
)

var (
	ErrNotExist    = errors.New("cluster not exist. ")
	ErrMaintaining = errors.New("cluster being maintaining .please try again later. ")
)

var ClusterManager *clusterManager

type clusterManager struct {
	clients sync.Map
}

type ClusterClient struct {
	Cluster    *db.Cluster
	Config     *rest.Config
	KubeClient ResourceHandler
}

func InitClusterManager() {
	sc := &clusterManager{clients: sync.Map{}}
	sc.load()
	xgo.Go(func() {
		sc.sync()
	})
	ClusterManager = sc
	return
}

func (s *clusterManager) sync() {
	for {
		s.load()
		time.Sleep(time.Second * 5)
	}
}

func (s *clusterManager) load() {
	// 读取数据库 gateway host
	dbClusters, err := db.ClusterNormalList(egorm.Conds{})
	if err != nil {
		invoker.Logger.Error("clusterManager", elog.String("step", "InstanceList"), elog.Any("err", err.Error()))
		return
	}
	olds := s.allKeys()
	news := make([]string, 0)
	newMap := make(map[string]*db.Cluster)
	for _, g := range dbClusters {
		k := g.Key()
		news = append(news, k)
		newMap[k] = g
	}
	adds := kutl.Difference(news, olds)
	dels := kutl.Difference(olds, news)
	if len(adds) > 0 || len(dels) > 0 {
		invoker.Logger.Info("streamConns", elog.Any("adds", adds), elog.Any("dels", dels))
	}
	for _, k := range adds {
		s.addConn(k, newMap[k])
	}
	for _, k := range dels {
		s.delConn(k)
	}
}

func (s *clusterManager) allKeys() []string {
	res := make([]string, 0)
	s.clients.Range(func(ip, _ interface{}) bool {
		res = append(res, ip.(string))
		return true
	})
	return res
}

func (s *clusterManager) addConn(key string, cluster *db.Cluster) {
	// deal with invalid cluster
	if cluster.ApiServer == "" {
		invoker.Logger.Warn("cluster's apiServer is null:%s", zap.String("clusterName", cluster.Name))
		return
	}
	clientSet, config, err := buildClient(cluster.ApiServer, cluster.KubeConfig)
	if err != nil {
		invoker.Logger.Warn(fmt.Sprintf("build cluster (%s)'s client error.", cluster.Name), zap.Error(err))
		return
	}
	cacheFactory, err := buildCacheController(clientSet)
	if err != nil {
		invoker.Logger.Warn(fmt.Sprintf("build cache controller for cluster (%s) error.", cluster.Name), zap.Error(err))
		return
	}
	cm := &ClusterClient{
		Config:     config,
		Cluster:    cluster,
		KubeClient: NewResourceHandler(clientSet, cacheFactory),
	}
	invoker.Logger.Debug("addConn", elog.Any("key", key), elog.Any("cluster", cluster.Name))
	s.clients.Store(key, cm)
}

func (s *clusterManager) delConn(key string) {
	invoker.Logger.Debug("delConn", elog.Any("key", key))
	s.clients.Delete(key)
}

func (s *clusterManager) GetClusterManager(clusterId int) (*ClusterClient, error) {
	obj, err := db.ClusterNormalInfo(clusterId)
	if err != nil {
		return nil, err
	}
	invoker.Logger.Debug("GetClusterManager", elog.String("key", obj.Key()))
	managerInterface, exist := s.clients.Load(obj.Key())
	// 如果不存在，则重新获取一次集群信息
	if !exist {
		return nil, ErrNotExist
	}
	manager := managerInterface.(*ClusterClient)
	if manager.Cluster.Status == db.ClusterStatusMaintaining {
		return nil, ErrMaintaining
	}
	return manager, nil
}
