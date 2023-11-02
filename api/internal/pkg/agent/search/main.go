package search

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker/manager"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const (
	KB = 1024
	MB = 1024 * KB
	GB = 1024 * MB

	PARTITION_MAX_SIZE = 4 * MB
	PARTITION_MAX_NUM  = 10
)

type Container struct {
	components []*Component
}

// Component 每个执行指令地方
type Component struct {
	request       Request
	file          *File
	startTime     int64
	endTime       int64
	words         []KeySearch
	filterWords   []string // 变成匹配的语句
	bash          *Bash
	limit         int64
	output        []string
	k8sInfo       *manager.K8SInfo
	interval      int64           // 请求 charts 时，划分的标准时间间隔
	times         int64           // 请求 charts 时，startTime - endTime 能被 interval 划分的段数
	charts        map[int64]int64 // key: offset(time - startTime / interval), value: lines
	mu            sync.Mutex
	partitionSize int64 // 每次缓冲区初始化为多大
	partitionNum  int   // 开启多少个协程任务
}

func (c *Component) IsChartRequest() bool {
	return c.interval > 0
}

// preparePartition calculate the number of slices and the size of the slices
// TODO: consider further partitioning according to runtime.NumCPU()
func (c *Component) preparePartition(from, to int64) {
	size := to - from + 1
	switch {
	case size <= 50*MB:
		c.partitionNum = 1
		c.partitionSize = 3 * MB
	case size <= GB:
		c.partitionNum = 2
		c.partitionSize = 5 * MB
	case size <= 2*GB:
		c.partitionNum = 3
		c.partitionSize = 3 * MB
	default:
		c.partitionNum = 3
		c.partitionSize = PARTITION_MAX_SIZE
	}
}

type KeySearch struct {
	Key   string
	Value interface{}
	Type  string
}

type CmdRequest struct {
	StartTime    string
	EndTime      string
	Date         string // last 30min,6h,1d,7d
	Path         string // 文件路径
	Dir          string // 文件夹路径
	KeyWord      string // 搜索的关键词
	Limit        int64  // 最少多少条数据
	IsK8S        bool
	K8SContainer []string
}

func (c CmdRequest) ToRequest() Request {
	var (
		st int64
		et int64
	)

	if c.StartTime != "" {
		sDate, err := time.Parse(time.DateTime, c.StartTime)
		st = sDate.Unix()
		if err != nil {
			elog.Panic("parse start time error", elog.FieldErr(err))
		}
	}

	if c.EndTime != "" {
		eDate, err := time.Parse(time.DateTime, c.EndTime)
		et = eDate.Unix()
		if err != nil {
			elog.Panic("parse end time error", elog.FieldErr(err))
		}
	}

	return Request{
		StartTime:    st,
		EndTime:      et,
		Date:         c.Date,
		Path:         c.Path,
		Dir:          c.Dir,
		KeyWord:      c.KeyWord,
		Limit:        c.Limit,
		IsCommand:    true,
		IsK8S:        c.IsK8S,
		K8SContainer: c.K8SContainer,
	}
}

type Request struct {
	StartTime      int64
	EndTime        int64
	Date           string // last 30min,6h,1d,7d
	Path           string // 文件路径
	Dir            string // 文件夹路径
	TruePath       []dto.AgentSearchTargetInfo
	KeyWord        string // 搜索的关键词
	Limit          int64  // 最少多少条数据
	IsCommand      bool   // 是否是命令行 默认不是
	IsK8S          bool
	K8SContainer   []string
	K8sClientType  string // 是 containerd，还是docker
	IsChartRequest bool   // 是否为请求 Charts
	Interval       int64  // 请求 charts 时，划分的标准时间间隔
}

func (req *Request) prepare() {
	if len(req.K8SContainer) != 0 && req.K8SContainer[0] == "" {
		req.K8SContainer = make([]string, 0)
	}
	var filePaths = make([]dto.AgentSearchTargetInfo, 0)
	elog.Info("agentRun", l.A("req", req))
	// 如果filename为空字符串，分割会得到一个长度为1的空字符串数组
	// req.Dir = "./test"
	if req.IsK8S {
		obj := cvdocker.NewContainer()
		req.K8sClientType = obj.ClientType
		containers := obj.GetActiveContainers()
		for _, value := range containers {
			if len(req.K8SContainer) == 0 {
				elog.Info("agentRun", l.S("step", "noContainer"), l.A("logPath", value.LogPath))
				filePaths = append(filePaths, dto.AgentSearchTargetInfo{
					K8sInfo:  value.K8SInfo,
					FilePath: value.LogPath,
				})
			} else {
				for _, v := range req.K8SContainer {
					if value.K8SInfo.Container == v {
						elog.Info("agentRun", l.S("step", "withContainer"), l.A("logPath", value.LogPath))
						filePaths = append(filePaths, dto.AgentSearchTargetInfo{
							K8sInfo:  value.K8SInfo,
							FilePath: value.LogPath,
						})
					} else {
						elog.Info("agentRun", l.S("step", "withContainer"), l.A("container", value.K8SInfo.Container))
					}
				}
			}
		}
	}
	if req.Path != "" {
		for _, p := range strings.Split(req.Path, ",") {
			filePaths = append(filePaths, dto.AgentSearchTargetInfo{
				FilePath: p,
			})
		}
	}
	if req.Dir != "" {
		for _, p := range findFiles(req.Dir) {
			filePaths = append(filePaths, dto.AgentSearchTargetInfo{
				FilePath: p,
			})
		}
	}
	req.TruePath = filePaths
}

func Run(req Request) (data view.RespAgentSearch, err error) {
	elog.Info("agent[node] log search start", elog.Any("req", req))
	data.Data = make([]view.RespAgentSearchItem, 0)

	req.prepare()
	data.K8sClientType = req.K8sClientType
	filePaths := req.TruePath

	if len(filePaths) == 0 {
		elog.Error("agent log search file cant empty", l.S("path", req.Path), l.S("dir", req.Dir), l.A("K8SContainer", req.K8SContainer), l.A("truePath", req.TruePath))
		return data, nil
	}
	// 多了没意义，自动变为 50，提示用户
	if req.Limit <= 0 || req.Limit > 500 {
		req.Limit = 50
		elog.Info("limit exceeds 500. it will be automatically set to 50", elog.Int64("limit", req.Limit))
	}
	container := &Container{}
	sw := sync.WaitGroup{}
	// 文件添加并发查找
	sw.Add(len(filePaths))
	for _, pathName := range filePaths {
		value := pathName
		go func() {
			defer sw.Done()
			comp, err := NewComponent(value, req)
			if err != nil {
				elog.Error("agent new component error", elog.FieldErr(err))
				sw.Done()
				return
			}
			container.components = append(container.components, comp)
			err = comp.SearchFile()
			if err != nil {
				elog.Error("agent search file error", l.S("path", comp.file.path), elog.FieldErr(err))
			}
		}()
	}
	sw.Wait()

	elog.Info("agent[node] log search over", elog.Any("resp", data), elog.Any("path", req.TruePath))
	if req.IsCommand {
		for _, comp := range container.components {
			fmt.Println(comp.bash.ColorAll(comp.file.path))
			for _, value := range comp.output {
				fmt.Println(value)
			}
		}
	} else {
		for _, comp := range container.components {
			for _, value := range comp.output {
				if value == "" {
					continue
				}
				ext := map[string]interface{}{
					"_file": comp.file.path,
				}
				if comp.k8sInfo != nil {
					ext["_namespace"] = comp.k8sInfo.Namespace
					ext["_container"] = comp.k8sInfo.Container
					ext["_pod"] = comp.k8sInfo.Pod
					ext["_image"] = comp.k8sInfo.Image
				}
				data.Data = append(data.Data, view.RespAgentSearchItem{
					Line: value,
					Ext:  ext,
				})
			}
		}
	}
	return data, nil
}

func NewComponent(targetInfo dto.AgentSearchTargetInfo, req Request) (*Component, error) {
	obj := &Component{
		k8sInfo: targetInfo.K8sInfo,
	}

	file, err := OpenFile(targetInfo.FilePath)
	if err != nil {
		elog.Error("agent open log file error", elog.FieldErr(err), elog.String("path", targetInfo.FilePath))
		return nil, errors.Wrapf(err, "open file %s error", targetInfo.FilePath)
	}
	if req.IsChartRequest {
		obj.interval = req.Interval
		obj.times = (req.EndTime - req.StartTime) / req.Interval
		obj.charts = make(map[int64]int64)
	}
	obj.file = file
	obj.startTime = req.StartTime
	obj.endTime = req.EndTime
	obj.request = req
	obj.words = Keyword2Array(req.KeyWord, true)
	filterString := make([]string, 0)
	for _, value := range obj.words {
		var info string
		if value.Type == typeInt {
			info = fmt.Sprintf(`"%s":%d`, value.Key, value.Value.(int))
		} else if value.Type == typeString {
			if value.Key == "" {
				// 模糊匹配内容
				info = value.Value.(string)
			} else {
				info = fmt.Sprintf(`"%s":"%s"`, value.Key, value.Value.(string))
			}
		}
		filterString = append(filterString, info)
	}

	sort.Slice(filterString, func(i, j int) bool {
		return len(filterString[i]) < len(filterString[j])
	})

	obj.filterWords = filterString
	obj.bash = NewBash()
	obj.limit = req.Limit
	return obj, nil
}

/*
 * searchFile 搜索文件内容
 * searchFile 2023-09-28 10:10:00 2023-09-28 10:20:00 /xxx/your_service.log`
 */
func (c *Component) SearchFile() error {
	defer c.file.ptr.Close()
	if c.file.size == 0 {
		elog.Info("file size is 0", l.S("path", c.file.path))
		return nil
	}
	var (
		start = int64(0)
		end   = c.file.size
		err   error
	)

	if c.startTime > 0 {
		start, err = searchByStartTime(c.file, c.startTime)
		if err != nil {
			return errors.Wrapf(err, "search start time error")
		}
	}
	if c.endTime > 0 {
		end, err = searchByEndTime(c.file, 0, c.endTime)
		if err != nil {
			return errors.Wrapf(err, "search end time error")
		}
	}
	if start != -1 && start <= end {
		c.preparePartition(start, end)
		if c.IsChartRequest() {
			err = c.searchCharts(start, end)
		} else {
			// read based on buffer
			err = c.getLogs(start, end)
		}
		if err != nil {
			return errors.Wrapf(err, "agent search logs error")
		}

		return err
	}
	return nil
}

func RunCharts(req Request) (resp view.RespAgentChartsSearch, err error) {
	elog.Info("agent[node] charts search start", elog.Any("req", req))
	req.prepare()
	filePaths := req.TruePath

	container := &Container{}
	sw := sync.WaitGroup{}
	// 文件添加并发查找
	sw.Add(len(filePaths))
	for _, pathName := range filePaths {
		value := pathName
		go func() {
			defer sw.Done()
			comp, err := NewComponent(value, req)
			if err != nil {
				elog.Error("agent new component error", elog.FieldErr(err))
				sw.Done()
				return
			}
			if req.KeyWord != "" && len(comp.words) == 0 {
				elog.Error("-k format is error", elog.FieldErr(err))
				sw.Done()
				return
			}
			container.components = append(container.components, comp)
			err = comp.SearchFile()
			if err != nil {
				elog.Error("agent search file error", elog.FieldErr(err))
			}
		}()
	}
	sw.Wait()

	charts := make(map[int64]int64)
	minTimes, maxTimes := int64(math.MaxInt64), int64(math.MinInt64)
	for _, comp := range container.components {
		for k, v := range comp.charts {
			charts[k] += v

			if k <= minTimes {
				minTimes = k
			}

			if k > maxTimes {
				maxTimes = k
			}
		}
	}
	resp.Data = charts
	resp.MinOffset = minTimes
	resp.MaxOffset = maxTimes
	resp.K8sClientType = req.K8sClientType
	if minTimes == math.MaxInt64 {
		resp.MinOffset = -1
	}

	if maxTimes == math.MinInt64 {
		resp.MinOffset = -1
	}
	return resp, nil
}

func ChartsIntervalConvert(interval int64) (standard int64) {
	switch {
	case interval <= 60*5:
		standard = 1
	case interval <= 60*30:
		standard = 60
	case interval <= 60*60*4:
		standard = 600
	case interval <= 60*60*24:
		standard = 3600
	case interval <= 60*60*24*7:
		standard = 21600
	default:
		standard = 86400
	}
	return
}
