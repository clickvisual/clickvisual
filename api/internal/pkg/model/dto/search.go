package dto

type SearchRequest struct {
	StartTime int64    `json:"startTime,string" form:"startTime"`
	EndTime   int64    `json:"endTime,string" form:"endTime"`
	Namespace string   `json:"namespace" form:"namespace"` // k8s namespace
	Date      string   `json:"date" form:"date"`           // last 30min,6h,1d,7d
	KeyWord   string   `json:"keyWord" form:"keyWord"`     // 搜索的关键词
	Limit     int64    `json:"limit,string" form:"limit"`  // 最少多少条数据
	Container []string `json:"container" form:"container"` // container信息
	IsK8s     int      `json:"isK8s,string" form:"isK8s"`  // 是否为k8s
	Dir       string   `json:"dir" form:"dir"`             // 文件夹路径
}
