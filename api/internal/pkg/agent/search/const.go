package search

type KeySearchType int

const (
	KeySearchTypeInt64   = 1
	KeySearchTypeFloat64 = 2
	KeySearchTypeString  = 3
)

type KeySearchOperate int

const (
	KeySearchOperateEqual = 1 // 相等
	KeySearchOperateGT    = 2 // 大于
	KeySearchOperateLT    = 3 // 小于
)

const (
	SkipPath = "clickvisual"
)

const (
	InnerKeyContainer = "_container_"
	InnerKeyFile      = "_file_"
	InnerKeyNamespace = "_namespace_"
	InnerKeyPod       = "_pod_"
)

var SystemKeyArr = []string{
	InnerKeyContainer,
	InnerKeyFile,
	InnerKeyNamespace,
	InnerKeyPod,
}
var SkipKeys = map[string]any{
	InnerKeyContainer: struct{}{},
	InnerKeyFile:      struct{}{},
	InnerKeyNamespace: struct{}{},
	InnerKeyPod:       struct{}{},
}
