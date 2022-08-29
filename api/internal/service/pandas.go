package service

import (
	"fmt"
	"strings"

	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// StructuralTransfer ...
func StructuralTransfer(req []view.Column) (res string) {
	for _, v := range req {
		res += fmt.Sprintf("`%s` %s comment '%s'\n,", v.Field, typeTransferMySQL2CH(v.Type), v.Comment)
	}
	return
}

// typeTransferMySQL2CH mysql -> clickhouse
func typeTransferMySQL2CH(typ string) string {
	if strings.HasPrefix(typ, "varchar") ||
		strings.HasPrefix(typ, "char") ||
		strings.Contains(typ, "text") {
		return "String"
	}
	if strings.HasPrefix(typ, "datetime") {
		return "DateTime"
	}
	if strings.HasPrefix(typ, "float") ||
		strings.HasPrefix(typ, "double") ||
		strings.HasPrefix(typ, "decimal") {
		return "Float64"
	}
	if strings.HasPrefix(typ, "json") {
		return "JSON"
	}
	return "unknown"
}
