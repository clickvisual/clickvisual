package search

import (
	"strings"
	"sync"

	"github.com/gotomicro/ego/core/elog"
)

type Container struct {
	components []*Component
}

// Component 每个执行指令地方
type Component struct {
	file        *File
	startTime   int64
	endTime     int64
	words       []KeySearch
	filterWords []string // 变成匹配的语句
	bash        *Bash
	limit       int64
	output      []string
	logs        []map[string]interface{}
}

type KeySearch struct {
	Key   string
	Value string
	Type  string
}

type Request struct {
	StartTime int64
	EndTime   int64
	Date      string // last 30min,6h,1d,7d
	Path      string // 文件路径
	Dir       string // 文件夹路径
	TruePath  []string
	KeyWord   string // 搜索的关键词
	Limit     int64  // 最少多少条数据
}

func Run(req Request) (logs []map[string]interface{}, err error) {
	var filePaths []string
	// 如果filename为空字符串，分割会得到一个长度为1的空字符串数组
	if req.Path != "" {
		filePaths = strings.Split(req.Path, ",")
	}
	if req.Dir != "" {
		filePathsByDir := findFiles(req.Dir)
		filePaths = append(filePaths, filePathsByDir...)
	}
	req.TruePath = filePaths
	if len(filePaths) == 0 {
		panic("file cant empty")
	}
	// 多了没意义，自动变为 50，提示用户
	if req.Limit <= 0 || req.Limit > 500 {
		req.Limit = 50
		elog.Info("limit exceeds 500. it will be automatically set to 50", elog.Int64("limit", req.Limit))
	}
	elog.Info("agent log search start", elog.Any("req", req))
	container := &Container{}
	l := sync.WaitGroup{}

	// 文件添加并发查找
	l.Add(len(filePaths))
	for _, pathName := range filePaths {
		value := pathName
		go func() {
			comp := NewComponent(req.StartTime, req.EndTime, value, req.KeyWord, req.Limit)
			if req.KeyWord != "" && len(comp.words) == 0 {
				elog.Error("-k format is error", elog.FieldErr(err))
				l.Done()
				return
			}
			container.components = append(container.components, comp)
			comp.SearchFile()
			l.Done()
		}()
	}
	l.Wait()

	logs = make([]map[string]interface{}, 0)
	for _, comp := range container.components {
		logs = append(logs, comp.logs...)
	}
	return logs, nil
}

func NewComponent(startTime int64, endTime int64, filename string, keyWord string, limit int64) *Component {
	obj := &Component{}
	file, err := OpenFile(filename)
	if err != nil {
		elog.Error("agent open log file error", elog.FieldErr(err), elog.String("path", filename))
	}

	obj.file = file
	obj.startTime = startTime
	obj.endTime = endTime
	words := make([]KeySearch, 0)

	arrs := strings.Split(keyWord, "and")
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
	obj.limit = limit
	return obj
}

/*
 * searchFile 搜索文件内容
 * searchFile 2023-09-28 10:10:00 2023-09-28 10:20:00 /xxx/your_service.log`
 */
func (c *Component) SearchFile() ([]map[string]interface{}, error) {
	defer c.file.ptr.Close()
	if c.file.size == 0 {
		panic("file size is 0")
	}

	var (
		start = int64(0)
		end   = c.file.size
		err   error
	)
	if c.startTime > 0 {
		start, err = c.searchByStartTime()
		if err != nil {
			elog.Error("agent search ts error", elog.FieldErr(err))
		}
	}
	if c.endTime > 0 {
		end, err = c.searchByEndTime()
		if err != nil {
			elog.Error("agent search ts error", elog.FieldErr(err))
		}
	}
	if start != -1 && start <= end {
		_, err = c.searchByBackWord(start, end)

		if err != nil {

		}

		if len(c.logs) == 0 {
			elog.Info("agent log search nothing", elog.Any("words", c.words))
		}
		return c.logs, err
	}
	elog.Info("agent log search nothing", elog.Any("words", c.words))
	return nil, nil
}
