package search

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gotomicro/cetus/l"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/pkg/cvdocker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type Container struct {
	components []*Component
}

// Component 每个执行指令地方
type Component struct {
	request     Request
	file        *File
	startTime   int64
	endTime     int64
	words       []KeySearch
	filterWords []string // 变成匹配的语句
	bash        *Bash
	limit       int64
	output      []string
}

type KeySearch struct {
	Key   string
	Value string
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
	StartTime     int64
	EndTime       int64
	Date          string // last 30min,6h,1d,7d
	Path          string // 文件路径
	Dir           string // 文件夹路径
	TruePath      []string
	KeyWord       string // 搜索的关键词
	Limit         int64  // 最少多少条数据
	IsCommand     bool   // 是否是命令行 默认不是
	IsK8S         bool
	K8SContainer  []string
	K8sClientType string // 是 containerd，还是docker
}

func Run(req Request) (data view.RespAgentSearch, err error) {
	data.Data = make([]view.RespAgentSearchItem, 0)
	if len(req.K8SContainer) != 0 && req.K8SContainer[0] == "" {
		req.K8SContainer = make([]string, 0)
	}
	var filePaths []string
	elog.Info("agentRun", l.A("req", req))
	// 如果filename为空字符串，分割会得到一个长度为1的空字符串数组
	if req.IsK8S {
		obj := cvdocker.NewContainer()
		req.K8sClientType = obj.ClientType
		data.K8sClientType = obj.ClientType
		containers := obj.GetActiveContainers()
		for _, value := range containers {
			if len(req.K8SContainer) == 0 {
				elog.Info("agentRun", l.S("step", "noContainer"), l.A("logPath", value.LogPath))
				filePaths = append(filePaths, value.LogPath)
			} else {
				for _, v := range req.K8SContainer {
					if value.K8SInfo.Container == v {
						elog.Info("agentRun", l.S("step", "withContainer"), l.A("logPath", value.LogPath))
						filePaths = append(filePaths, value.LogPath)
					}
				}
			}
		}
	}
	if req.Path != "" {
		filePaths = strings.Split(req.Path, ",")
	}
	if req.Dir != "" {
		filePathsByDir := findFiles(req.Dir)
		filePaths = append(filePaths, filePathsByDir...)
	}
	req.TruePath = filePaths
	if len(filePaths) == 0 {
		elog.Error("agent log search file cant empty", l.S("path", req.Path), l.S("dir", req.Dir), l.A("K8SContainer", req.K8SContainer), l.A("truePath", req.TruePath))
		return data, errors.New("file cant empty")
	}
	// 多了没意义，自动变为 50，提示用户
	if req.Limit <= 0 || req.Limit > 500 {
		req.Limit = 50
		elog.Info("limit exceeds 500. it will be automatically set to 50", elog.Int64("limit", req.Limit))
	}
	elog.Info("agent log search start", elog.Any("req", req))
	container := &Container{}
	sw := sync.WaitGroup{}
	// 文件添加并发查找
	sw.Add(len(filePaths))
	for _, pathName := range filePaths {
		value := pathName
		go func() {
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
			sw.Done()
		}()
	}
	sw.Wait()

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
				data.Data = append(data.Data, view.RespAgentSearchItem{
					Line: value,
					Ext:  map[string]interface{}{"_file": comp.file.path},
				})
			}
		}
	}
	return data, nil
}

func NewComponent(filename string, req Request) (*Component, error) {
	obj := &Component{}
	file, err := OpenFile(filename)
	if err != nil {
		elog.Error("agent open log file error", elog.FieldErr(err), elog.String("path", filename))
		return nil, errors.Wrapf(err, "open file %s error", filename)
	}
	obj.file = file
	obj.startTime = req.StartTime
	obj.endTime = req.EndTime
	obj.request = req
	words := make([]KeySearch, 0)

	arrs := strings.Split(req.KeyWord, "and")
	for _, value := range arrs {
		if strings.Contains(value, "=") {
			info := strings.Split(value, "=")
			v := strings.Trim(info[1], " ")
			v = strings.ReplaceAll(v, `"`, "")
			v = strings.ReplaceAll(v, `'`, "")
			word := KeySearch{
				Key:   strings.Trim(info[0], " "),
				Value: v,
			}
			words = append(words, word)
		}
	}
	obj.words = words
	filterString := make([]string, 0)
	for _, value := range words {
		var info string
		if value.Type == "int" {
			info = `"` + value.Key + `":` + value.Value
		} else {
			info = `"` + value.Key + `":"` + value.Value + `"`
		}
		filterString = append(filterString, info)
	}
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
		return errors.New("file size is 0")
	}
	var (
		start = int64(0)
		end   = c.file.size
		err   error
	)
	if c.startTime > 0 {
		start, err = c.searchByStartTime()
		if err != nil {
			return errors.Wrapf(err, "search start time error")
		}
	}
	if c.endTime > 0 {
		end, err = c.searchByEndTime()
		if err != nil {
			return errors.Wrapf(err, "search end time error")
		}
	}
	if start != -1 && start <= end {
		err = c.searchByBackWord(start, end)
		if err != nil {
			return errors.Wrapf(err, "search by back word error")
		}

		return err
	}
	return nil
}
