package search

const (
	typeString = "string"
	typeInt    = "int"
)

const (
	SkipPath = "clickvisual"
)

const (
	InnerKeyContainer = "_container"
	InnerKeyFile      = "_file"
	InnerKeyNamespace = "_namespace"
	InnerKeyPod       = "_pod"
)

var SkipKeys = map[string]interface{}{
	InnerKeyContainer: struct{}{},
	InnerKeyFile:      struct{}{},
	InnerKeyNamespace: struct{}{},
	InnerKeyPod:       struct{}{},
}
