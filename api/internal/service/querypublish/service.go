package querypublish

import (
	"errors"
	"fmt"
	"strings"

	"github.com/ego-component/egorm"
	errorsx "github.com/pkg/errors"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/constx"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
)

func BuildPublishDraft(req view.PublishDraftRequest) (view.PublishDraft, error) {
	if req.SourceType == "" {
		return view.PublishDraft{}, errors.New("sourceType cannot be empty")
	}
	if req.Normalization.BodyPath == "" {
		return view.PublishDraft{}, errors.New("normalization.bodyPath cannot be empty")
	}
	if req.Normalization.TimePath == "" {
		return view.PublishDraft{}, errors.New("normalization.timePath cannot be empty")
	}

	warnings := buildWarnings(req)
	return view.PublishDraft{
		SourceType:      req.SourceType,
		Normalization:   req.Normalization,
		QueryableFields: req.QueryableFields,
		DefaultFields:   dedupe(req.DefaultFields),
		Warnings:        warnings,
		RequiresConfirm: true,
	}, nil
}

func buildWarnings(req view.PublishDraftRequest) []view.QueryWarning {
	warnings := make([]view.QueryWarning, 0)

	defaultFieldSet := make(map[string]struct{}, len(req.DefaultFields))
	acceleratedDefaultCount := 0
	for _, fieldKey := range req.DefaultFields {
		defaultFieldSet[fieldKey] = struct{}{}
	}

	matchedDefaultCount := 0
	for _, field := range req.QueryableFields {
		if _, ok := defaultFieldSet[field.FieldKey]; !ok {
			continue
		}
		matchedDefaultCount++
		if field.IsAccelerated {
			acceleratedDefaultCount++
		}
	}

	if len(req.QueryableFields) == 0 {
		warnings = append(warnings, view.QueryWarning{
			Code:    "publish.queryable_fields_empty",
			Level:   "warning",
			Message: "当前发布草案未包含可查询字段，建议先回到字段目录步骤检查样本解析结果。",
		})
	}
	if len(req.DefaultFields) == 0 {
		warnings = append(warnings, view.QueryWarning{
			Code:    "publish.default_fields_empty",
			Level:   "warning",
			Message: "当前未选择默认字段，用户首次进入查询页时只能看到原始字段目录。",
		})
	}
	if len(req.DefaultFields) > 0 && matchedDefaultCount < len(defaultFieldSet) {
		warnings = append(warnings, view.QueryWarning{
			Code:    "publish.default_fields_missing",
			Level:   "warning",
			Message: "部分默认字段未出现在当前字段目录中，建议确认字段选择是否过期。",
		})
	}
	if len(req.DefaultFields) > 0 && acceleratedDefaultCount == 0 {
		warnings = append(warnings, view.QueryWarning{
			Code:    "publish.default_fields_json_only",
			Level:   "info",
			Message: "当前默认字段全部走 JSON 路径查询，建议上线后观察慢查询，再决定是否增加物化列。",
		})
	}
	if req.Normalization.NeedNestedJSON && req.Normalization.NestedJSONPath == "" {
		warnings = append(warnings, view.QueryWarning{
			Code:    "publish.nested_json_path_missing",
			Level:   "warning",
			Message: "已开启二次 JSON 解析，但未指定 nestedJsonPath，发布前需再次确认。",
		})
	}

	return warnings
}

func dedupe(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, item := range values {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func Publish(uid int, req view.PublishRequest) (view.PublishResult, error) {
	if uid == 0 {
		return view.PublishResult{}, errors.New("unable to get authorization information")
	}
	if err := validatePublishRequest(req); err != nil {
		return view.PublishResult{}, err
	}

	tx := invoker.Db.Begin()
	result, err := publishInTx(tx, uid, req)
	if err != nil {
		tx.Rollback()
		return view.PublishResult{}, err
	}
	if err = tx.Commit().Error; err != nil {
		return view.PublishResult{}, err
	}
	return result, nil
}

func validatePublishRequest(req view.PublishRequest) error {
	if req.SourceType == "" {
		return errors.New("sourceType cannot be empty")
	}
	if req.Normalization.BodyPath == "" {
		return errors.New("normalization.bodyPath cannot be empty")
	}
	if req.Normalization.TimePath == "" {
		return errors.New("normalization.timePath cannot be empty")
	}
	if req.Target.InstanceId == 0 {
		return errors.New("target.instanceId cannot be empty")
	}
	if strings.TrimSpace(req.Target.DatabaseName) == "" {
		return errors.New("target.databaseName cannot be empty")
	}
	if strings.TrimSpace(req.Target.TableName) == "" {
		return errors.New("target.tableName cannot be empty")
	}
	if strings.TrimSpace(req.Target.Desc) == "" {
		return errors.New("target.desc cannot be empty")
	}
	return nil
}

func publishInTx(tx *gorm.DB, uid int, req view.PublishRequest) (view.PublishResult, error) {
	databaseName := strings.TrimSpace(req.Target.DatabaseName)
	tableName := strings.TrimSpace(req.Target.TableName)

	databaseInfo, err := ensurePublishDatabase(tx, uid, req.Target.InstanceId, databaseName, strings.TrimSpace(req.Target.Cluster), strings.TrimSpace(req.Target.Desc))
	if err != nil {
		return view.PublishResult{}, errorsx.Wrap(err, "ensure publish database")
	}

	conds := egorm.Conds{
		"did":  databaseInfo.ID,
		"name": tableName,
	}
	existTable, err := db.TableInfoX(tx, conds)
	if err != nil {
		return view.PublishResult{}, errorsx.Wrap(err, "load existing table")
	}
	if existTable.ID != 0 {
		return view.PublishResult{}, fmt.Errorf("table %s is already exist in clickvisual", tableName)
	}

	tableInfo := db.BaseTable{
		Did:           databaseInfo.ID,
		Name:          tableName,
		Uid:           uid,
		Desc:          strings.TrimSpace(req.Target.Desc),
		TimeField:     req.Normalization.TimePath,
		TimeFieldType: req.Target.TimeFieldType,
		CreateType:    constx.TableCreateTypeExist,
		RawLogField:   req.Normalization.BodyPath,
	}
	if err = db.TableCreate(tx, &tableInfo); err != nil {
		return view.PublishResult{}, errorsx.Wrap(err, "create local table record")
	}

	fieldCount, err := createQueryableIndexes(tx, tableInfo.ID, req.QueryableFields)
	if err != nil {
		return view.PublishResult{}, errorsx.Wrap(err, "create queryable indexes")
	}

	return view.PublishResult{
		InstanceId:    req.Target.InstanceId,
		DatabaseId:    databaseInfo.ID,
		DatabaseName:  databaseInfo.Name,
		TableId:       tableInfo.ID,
		TableName:     tableInfo.Name,
		FieldCount:    fieldCount,
		DefaultFields: dedupe(req.DefaultFields),
	}, nil
}

func createQueryableIndexes(tx *gorm.DB, tableID int, fields []view.QueryableField) (int, error) {
	if len(fields) == 0 {
		return 0, nil
	}

	created := 0
	seen := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		fieldName := strings.TrimSpace(field.FieldKey)
		if fieldName == "" {
			continue
		}
		if _, ok := seen[fieldName]; ok {
			continue
		}
		seen[fieldName] = struct{}{}

		indexItem := db.BaseIndex{
			Tid:      tableID,
			Field:    fieldName,
			Typ:      mapIndexType(field.ValueType),
			Alias:    strings.TrimSpace(field.DisplayName),
			RootName: deriveRootName(field.Path),
			Kind:     mapIndexKind(field.Source),
		}
		if err := db.IndexCreate(tx, &indexItem); err != nil {
			return created, err
		}
		created++
	}
	return created, nil
}

func mapIndexType(valueType view.QueryValueType) int {
	switch valueType {
	case view.QueryValueTypeNumber:
		return 1
	default:
		return db.IndexTypeString
	}
}

func mapIndexKind(source view.QueryFieldSource) int {
	switch source {
	case view.QueryFieldSourceColumn:
		return db.IndexKindBase
	default:
		return db.IndexKindLog
	}
}

func deriveRootName(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	parts := strings.Split(trimmed, ".")
	if len(parts) <= 1 {
		return ""
	}
	return strings.Join(parts[:len(parts)-1], ".")
}

func ensurePublishDatabase(tx *gorm.DB, uid, instanceID int, name, cluster, desc string) (db.BaseDatabase, error) {
	conds := egorm.Conds{
		"iid":  instanceID,
		"name": name,
	}
	existing, err := db.DatabaseInfoX(tx, conds)
	if err != nil {
		return db.BaseDatabase{}, errorsx.Wrap(err, "load local database record")
	}
	if existing.ID != 0 {
		if existing.Desc == "" && desc != "" {
			if err = db.DatabaseUpdate(tx, existing.ID, map[string]interface{}{"desc": desc}); err != nil {
				return db.BaseDatabase{}, err
			}
			existing.Desc = desc
		}
		return existing, nil
	}

	operator, err := service.InstanceManager.Load(instanceID)
	if err != nil {
		return db.BaseDatabase{}, errorsx.Wrapf(err, "load instance operator: instanceId=%d", instanceID)
	}
	remoteDatabases, err := operator.ListDatabase()
	if err != nil {
		return db.BaseDatabase{}, errorsx.Wrap(err, "list remote databases")
	}

	isCreateByCV := 0
	if !containsDatabase(remoteDatabases, name) {
		if err = operator.CreateDatabase(name, cluster); err != nil {
			return db.BaseDatabase{}, errorsx.Wrap(err, "create database")
		}
		isCreateByCV = 1
	}

	created := db.BaseDatabase{
		Iid:          instanceID,
		Name:         name,
		Uid:          uid,
		Cluster:      cluster,
		IsCreateByCV: isCreateByCV,
		Desc:         desc,
	}
	if err = db.DatabaseCreate(tx, &created); err != nil {
		return db.BaseDatabase{}, errorsx.Wrap(err, "create local database record")
	}
	return created, nil
}

func containsDatabase(items []*view.RespDatabaseSelfBuilt, target string) bool {
	for _, item := range items {
		if item != nil && item.Name == target {
			return true
		}
	}
	return false
}
