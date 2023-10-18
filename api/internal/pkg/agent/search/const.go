package search

const (
	typeString = "string"
	typeInt    = "int"
)

const (
	InnerKeyContainer = "_container"
)

var SkipKeys = map[string]interface{}{InnerKeyContainer: struct{}{}}
