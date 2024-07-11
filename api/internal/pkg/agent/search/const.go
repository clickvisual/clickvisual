package search

import (
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

type KeySearchType int

const (
	KeySearchTypeInt64   = 1
	KeySearchTypeFloat64 = 2
	KeySearchTypeString  = 3
)

type SearchOperate int

const (
	KeySearchOperateEqual = 1 // 相等
	KeySearchOperateGT    = 2 // 大于
	KeySearchOperateLT    = 3 // 小于
	KeySearchOperateLike  = 4 // Like
)

const (
	SkipPath = "clickvisual"
)

const (
	InnerKeyContainer = "_container_"
	InnerKeyFile      = "_file_"
	InnerKeyNamespace = "_namespace_"
	InnerKeyPod       = "_pod_"
	InnerRawLog       = "_raw_log_"
)

var SystemKeyArr = []string{
	InnerKeyContainer,
	InnerKeyFile,
	InnerKeyNamespace,
	InnerKeyPod,
	InnerRawLog,
}

// DefaultBaseFields Type
// string 0
// int 1
// float 2
var DefaultBaseFields = []*view.RespColumn{
	&view.RespColumn{Name: "_container_", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "_file_", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "_namespace_", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "_pod_", TypeDesc: "", Type: 0},
}

var DefaultLogFields = []*view.RespColumn{
	&view.RespColumn{Name: "lv", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "msg", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "comp", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "compName", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "addr", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "x-shimo-user-id", TypeDesc: "", Type: 1},
	&view.RespColumn{Name: "ucode", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "name", TypeDesc: "", Type: 0},
	&view.RespColumn{Name: "tid", TypeDesc: "", Type: 0},
}
