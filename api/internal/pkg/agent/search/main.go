package search

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ego-component/ek8s"
	"github.com/ego-component/eos"
	"github.com/ego-component/excelplus"
	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/client/ehttp"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"github.com/spf13/cast"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/clickvisual/clickvisual/api/internal/pkg/agent/search/searchexcel"
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker/manager"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/dto"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/pkg/utils"
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
	commandOutput []string
	k8sInfo       *manager.ContainerInfo
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
		StartTime:     st,
		EndTime:       et,
		Date:          c.Date,
		Path:          c.Path,
		Dir:           c.Dir,
		KeyWord:       c.KeyWord,
		Limit:         c.Limit,
		IsCommand:     true,
		IsK8S:         c.IsK8S,
		IsUploadExcel: econf.GetBool("upload.enable"),
		IsAllCurl:     econf.GetBool("k8s.enable"),
		K8SContainer:  c.K8SContainer,
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
	IsUploadExcel  bool   //
	Namespace      string // 指定namespace
	IsK8S          bool
	K8SContainer   []string
	K8sClientType  string // 是 containerd，还是docker
	IsChartRequest bool   // 是否为请求 Charts
	IsAllCurl      bool
	Interval       int64 // 请求 charts 时，划分的标准时间间隔
}

func (req *Request) prepare() {
	if len(req.K8SContainer) != 0 && req.K8SContainer[0] == "" {
		req.K8SContainer = make([]string, 0)
	}
	var filePaths = make([]dto.AgentSearchTargetInfo, 0)
	// 如果filename为空字符串，分割会得到一个长度为1的空字符串数组
	// req.Dir = "./test"
	if req.IsK8S {
		obj := cvdocker.NewContainer()
		req.K8sClientType = obj.ClientType
		containers := obj.GetActiveContainers()
		for _, value := range containers {
			if len(req.K8SContainer) == 0 {
				elog.Info("agentRun", l.S("step", "noContainer"), l.A("logPath", value.ContainerInfo.LogPath))
				filePaths = req.prepareByNamespace(filePaths, value)
			} else {
				for _, v := range req.K8SContainer {
					if value.ContainerInfo.Container == v {
						filePaths = req.prepareByNamespace(filePaths, value)
					} else {
						elog.Info("agentRun", l.S("step", "withContainer"), l.A("container", value.ContainerInfo.Container))
					}
				}
			}
		}
	}
	if req.Path != "" {
		for _, p := range strings.Split(req.Path, ",") {
			if strings.Contains(p, SkipPath) {
				continue
			}
			filePaths = append(filePaths, dto.AgentSearchTargetInfo{
				FilePath: p,
			})
		}
	}
	if req.Dir != "" && req.Path == "" {
		for _, p := range findFiles(req.Dir) {
			if strings.Contains(p, SkipPath) {
				continue
			}
			filePaths = append(filePaths, dto.AgentSearchTargetInfo{
				FilePath: p,
			})
		}
	}
	req.TruePath = filePaths
	elog.Info("agentRun", l.A("req", req))
}

func (req *Request) prepareByNamespace(filePaths []dto.AgentSearchTargetInfo, value *manager.DockerInfo) []dto.AgentSearchTargetInfo {
	if strings.Contains(value.ContainerInfo.LogPath, SkipPath) || strings.Contains(value.ContainerInfo.Container, SkipPath) {
		return filePaths
	}
	if req.Namespace != "" && req.Namespace == value.ContainerInfo.Namespace {
		elog.Info("agentRun", l.S("step", "withContainer"), l.A("logPath", value.ContainerInfo.LogPath))
		filePaths = append(filePaths, dto.AgentSearchTargetInfo{
			K8sInfo:  value.ContainerInfo,
			FilePath: value.ContainerInfo.LogPath,
		})
	} else {
		filePaths = append(filePaths, dto.AgentSearchTargetInfo{
			K8sInfo:  value.ContainerInfo,
			FilePath: value.ContainerInfo.LogPath,
		})
	}
	return filePaths
}

// LogRes defines HTTP JSON response
type LogRes struct {
	// Code means response business code
	Code int `json:"code"`
	// Msg means response extra message
	Msg string `json:"msg"`
	// Data means response data payload
	Data view.RespAgentSearch `json:"data"`
}

func Run(req Request) (data view.RespAgentSearch, err error) {
	elog.Info("agent[node] log search start", elog.Any("req", req))
	data.Data = make([]view.RespAgentSearchItem, 0)

	// 如果是请求所有的 curl，直接返回
	if req.IsAllCurl {
		obj := ek8s.Load("k8s").Build()
		if econf.GetString("k8s.labelSelector") == "" {
			elog.Panic("k8s label selector cant empty")
		}
		list2, err := obj.CoreV1().Pods(req.Namespace).List(context.Background(), metav1.ListOptions{
			LabelSelector: econf.GetString("k8s.labelSelector"),
		})
		if err != nil {
			elog.Error("k8s get pods error", elog.FieldErr(err), elog.Any("namespace", econf.GetString("inspectLog.namespace")), elog.Any("labelSelector", econf.GetString("k8s.labelSelector")))
		}
		ips := make([]string, 0)
		for _, value := range list2.Items {
			ips = append(ips, value.Status.PodIP)
		}

		if len(ips) == 0 {
			return data, nil
		}

		eclient := ehttp.Load("").Build()
		exFile := excelplus.Load().Build(
			excelplus.WithDefaultSheetName("结果表"),
			excelplus.WithS3(eos.Load("upload").Build()),
			excelplus.WithEnableUpload(req.IsUploadExcel),
		)
		exSheet, err := exFile.NewSheet("结果表", searchexcel.Logger{})
		if err != nil {
			elog.Panic("agent new sheet error", elog.FieldErr(err))
		}

		v := url.Values{}
		v.Set("isK8s", "1")
		v.Set("keyWord", req.KeyWord)
		if req.Date != "" {
			req.StartTime, req.EndTime = calculateStartTimeAndEndTime(req.Date)
		}

		v.Set("startTime", cast.ToString(req.StartTime))
		v.Set("endTime", cast.ToString(req.EndTime))
		v.Set("limit", cast.ToString(req.Limit))
		v.Set("namespace", req.Namespace)

		elog.Info("k8s ips", elog.FieldValueAny(ips))

		for _, ip := range ips {
			url := "http://" + ip + ":" + econf.GetString("k8s.port") + "/api/v1/search?" + v.Encode()
			elog.Info("k8s log url", elog.FieldValueAny(url))
			resp, err := eclient.SetTimeout(30 * time.Second).R().Get(url)
			if err != nil {
				elog.Error("eclient log fail", elog.FieldErr(err), elog.Any("ip", ip))
				continue
			}
			var output LogRes
			err = json.Unmarshal(resp.Body(), &output)
			if err != nil {
				elog.Panic("json unmarshal fail", elog.FieldErr(err))
			}
			for _, value := range output.Data.Data {
				if value.Line == "" {
					continue
				}

				var timeInfo string
				curTime, indexValue := utils.IndexParseTime(value.Line)
				if indexValue > 0 {
					curTimeParser := utils.TimeParse(curTime)
					timeInfo = curTimeParser.Format("2006-01-02 15:04:05")
				}
				loggerInfo := searchexcel.Logger{
					FilePath:  value.Ext["_file"].(string),
					Ip:        ip,
					Log:       value.Line,
					Time:      timeInfo,
					Namespace: value.Ext["_namespace"].(string),
					Container: value.Ext["_container"].(string),
					Pod:       value.Ext["_pod"].(string),
					Image:     value.Ext["_image"].(string),
				}
				err = exSheet.SetRow(loggerInfo)
				if err != nil {
					elog.Panic("agent set row error", elog.FieldErr(err))
				}
			}
		}

		err = exFile.SaveAs(context.Background(), fmt.Sprintf("clickvisual_log_search/%s/agent_search_%s.xlsx", time.Now().Format("2006_01_02"), time.Now().Format("2006_01_02_15_04_05")))
		if err != nil {
			elog.Panic("agent save as error", elog.FieldErr(err))
		}

		return data, nil
	}

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
				elog.Error("agent new component RunLogs error", elog.FieldErr(err))
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
			for _, value := range comp.commandOutput {
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
					"_file":      comp.file.path,
					"_namespace": "",
					"_container": "",
					"_pod":       "",
					"_image":     "",
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

	// 是否需要上传excel
	if req.IsUploadExcel {
		exFile := excelplus.Load().Build(
			excelplus.WithDefaultSheetName("结果表"),
			excelplus.WithS3(eos.Load("upload").Build()),
			excelplus.WithEnableUpload(req.IsUploadExcel),
		)
		exSheet, err := exFile.NewSheet("结果表", searchexcel.Logger{})
		if err != nil {
			elog.Panic("agent new sheet error", elog.FieldErr(err))
		}
		for _, comp := range container.components {
			for _, value := range comp.output {
				if value == "" {
					continue
				}

				var timeInfo string
				curTime, indexValue := utils.IndexParseTime(value)
				if indexValue > 0 {
					curTimeParser := utils.TimeParse(curTime)
					timeInfo = curTimeParser.Format("2006-01-02 15:04:05")
				}

				loggerInfo := searchexcel.Logger{
					FilePath: comp.file.path,
					Log:      value,
					Time:     timeInfo,
				}
				if comp.k8sInfo != nil {
					loggerInfo.Namespace = comp.k8sInfo.Namespace
					loggerInfo.Container = comp.k8sInfo.Container
					loggerInfo.Pod = comp.k8sInfo.Pod
					loggerInfo.Image = comp.k8sInfo.Image
				}
				err = exSheet.SetRow(loggerInfo)
				if err != nil {
					elog.Panic("agent set row error", elog.FieldErr(err))
				}
			}
		}
		err = exFile.SaveAs(context.Background(), fmt.Sprintf("clickvisual_log_search/%s/agent_search_%s.xlsx", time.Now().Format("2006_01_02"), time.Now().Format("2006_01_02_15_04_05")))
		if err != nil {
			elog.Panic("agent save as error", elog.FieldErr(err))
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

	obj.startTime = req.StartTime
	obj.endTime = req.EndTime
	if req.Date != "" {
		obj.startTime, obj.endTime = calculateStartTimeAndEndTime(req.Date)
	}

	obj.file = file
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

	elog.Info("NewComponentSearch", l.A("keyword", req.KeyWord), l.A("words", obj.words), l.A("filterString", filterString))

	obj.filterWords = filterString
	obj.bash = NewBash()
	obj.limit = req.Limit
	return obj, nil
}

func calculateStartTimeAndEndTime(date string) (st, et int64) {
	switch date {
	case "last 6h":
		st = time.Now().Add(-6 * time.Hour).Unix()
		et = time.Now().Unix()
	case "last 12h":
		st = time.Now().Add(-12 * time.Hour).Unix()
		et = time.Now().Unix()
	case "last 24h":
		st = time.Now().Add(-24 * time.Hour).Unix()
		et = time.Now().Unix()
	case "last 7d":
		st = time.Now().Add(-7 * 24 * time.Hour).Unix()
		et = time.Now().Unix()
	case "yesterday":
		ts := time.Now().AddDate(0, 0, -1)
		st = time.Date(ts.Year(), ts.Month(), ts.Day(), 0, 0, 0, 0, ts.Location()).Unix()
		et = time.Date(ts.Year(), ts.Month(), ts.Day(), 23, 59, 59, 0, ts.Location()).Unix()
	case "today":
		ts := time.Now().AddDate(0, 0, 0)
		st = time.Date(ts.Year(), ts.Month(), ts.Day(), 0, 0, 0, 0, ts.Location()).Unix()
		et = time.Date(ts.Year(), ts.Month(), ts.Day(), 23, 59, 59, 0, ts.Location()).Unix()
	default:
		st = time.Now().Add(-6 * time.Hour).Unix()
		et = time.Now().Unix()
	}
	return
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
		// startPos 从0开始，那么end就是size-1
		startPos = int64(0)
		endPos   = c.file.size - 1
		err      error
	)

	if c.startTime > 0 {
		startPos, err = searchByStartTime(c.file, c.startTime)
		if err != nil {
			return errors.Wrapf(err, "search startPos time error")
		}
	}
	if c.endTime > 0 {
		endPos, err = searchByEndTime(c.file, 0, c.endTime)
		if err != nil {
			return errors.Wrapf(err, "search endPos time error")
		}
	}
	if startPos != -1 && startPos <= endPos {
		c.preparePartition(startPos, endPos)
		if c.IsChartRequest() {
			err = c.searchCharts(startPos, endPos)
		} else {
			// read based on buffer
			err = c.getLogs(startPos, endPos)
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
				elog.Error("agent new component RunCharts error", elog.FieldErr(err))
				return
			}
			if req.KeyWord != "" && len(comp.words) == 0 {
				elog.Error("-k format is error", elog.FieldErr(err))
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
