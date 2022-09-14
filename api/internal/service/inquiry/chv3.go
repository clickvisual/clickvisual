package inquiry

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/bumo"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/cluster"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builder/standalone"
	"github.com/clickvisual/clickvisual/api/internal/service/inquiry/builderv2"
	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// StorageCreateV3 create default stream data table and view
func (c *ClickHouse) StorageCreateV3(did int, database db.BaseDatabase, ct view.ReqStorageCreateV3) (dStreamSQL, dDataSQL, dViewSQL, dDistributedSQL string, err error) {
	dName := genNameWithMode(c.mode, database.Name, ct.TableName)
	dStreamName := genStreamNameWithMode(c.mode, database.Name, ct.TableName)
	// build view statement
	var timeTyp string
	if ct.TimeFieldType == TableTypeString {
		timeTyp = "String"
	} else if ct.TimeFieldType == TableTypeFloat {
		timeTyp = "Float64"
	} else {
		// TODO more check
		timeTyp = "Float64"
	}
	dataParams := bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       ct.TimeField,
		Data: bumo.ParamsData{
			TableName: dName,
			Days:      ct.Days,
		},
	}
	streamParams := bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       ct.TimeField,
		Stream: bumo.ParamsStream{
			TableName:               dStreamName,
			TableTyp:                timeTyp,
			Brokers:                 ct.Brokers,
			Topic:                   ct.Topics,
			Group:                   database.Name + "_" + ct.TableName,
			ConsumerNum:             ct.Consumers,
			KafkaSkipBrokenMessages: ct.KafkaSkipBrokenMessages,
		},
	}
	if c.mode == ModeCluster {
		dataParams.Cluster = database.Cluster
		dataParams.ReplicaStatus = c.rs
		streamParams.Cluster = database.Cluster
		streamParams.ReplicaStatus = c.rs
		dDataSQL = builder.Do(new(cluster.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(cluster.StreamBuilder), streamParams)
	} else {
		dDataSQL = builder.Do(new(standalone.DataBuilder), dataParams)
		dStreamSQL = builder.Do(new(standalone.StreamBuilder), streamParams)
	}
	_, err = c.db.Exec(dStreamSQL)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dStreamSQL", dStreamSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	_, err = c.db.Exec(dDataSQL)
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dDataSQL", dDataSQL), elog.Any("err", err.Error()), elog.Any("mode", c.mode), elog.Any("cluster", database.Cluster))
		return
	}
	dViewSQL, err = c.storageViewOperatorV3(view.OperatorViewParams{
		Typ:              ct.TimeFieldType,
		Tid:              0,
		Did:              did,
		Table:            ct.TableName,
		CustomTimeField:  "",
		Current:          nil,
		List:             nil,
		Indexes:          nil,
		IsCreate:         true,
		TimeField:        ct.TimeField,
		IsKafkaTimestamp: ct.IsKafkaTimestamp,
	})
	if err != nil {
		invoker.Logger.Error("TableCreate", elog.Any("dViewSQL", dViewSQL), elog.Any("err", err.Error()))
		return
	}
	if c.mode == ModeCluster {
		dDistributedSQL = builder.Do(new(cluster.DataBuilder), bumo.Params{
			Cluster:       database.Cluster,
			ReplicaStatus: c.rs,
			Data: bumo.ParamsData{
				DataType:    bumo.DataTypeDistributed,
				TableName:   genName(database.Name, ct.TableName),
				SourceTable: dName,
			},
		})
		invoker.Logger.Debug("TableCreate", elog.Any("distributeSQL", dDistributedSQL))
		_, err = c.db.Exec(dDistributedSQL)
		if err != nil {
			invoker.Logger.Error("TableCreate", elog.Any("dDistributedSQL", dDistributedSQL), elog.Any("err", err.Error()))
			return
		}
	}
	if ct.V3TableType == 1 {
		// jaegerJson dependencies table
		sc, errGetTableCreator := builderv2.GetTableCreator(builderv2.StorageTypeTraceCal)
		if errGetTableCreator != nil {
			invoker.Logger.Error("TableCreate", elog.String("step", "GetTableCreator"), elog.FieldErr(errGetTableCreator))
			return
		}
		params := builderv2.Params{
			IsShard:   false,
			IsReplica: false,
			Cluster:   database.Cluster,
			Database:  database.Name,
			Table:     ct.TableName + db.SuffixJaegerJSON,
			TTL:       ct.Days,
			DB:        c.db,
		}
		if c.mode == ModeCluster {
			params.IsShard = true
			if c.rs == 0 {
				params.IsReplica = true
			}
		}
		sc.SetParams(params)
		if _, err = sc.Execute(sc.GetDistributedSQL()); err != nil {
			invoker.Logger.Error("TableCreate", elog.String("step", "GetDistributedSQL"), elog.FieldErr(err))
			return
		}
		if _, err = sc.Execute(sc.GetMergeTreeSQL()); err != nil {
			invoker.Logger.Error("TableCreate", elog.String("step", "GetDistributedSQL"), elog.FieldErr(err))
			return
		}
	}
	return
}

func (c *ClickHouse) storageViewOperatorV3(param view.OperatorViewParams) (res string, err error) {
	databaseInfo, err := db.DatabaseInfo(invoker.Db, param.Did)
	if err != nil {
		return
	}
	if c.mode == ModeCluster {
		param.Table += "_local"
	}
	viewName := genViewName(databaseInfo.Name, param.Table, param.CustomTimeField)
	defer func() {
		if err != nil {
			c.viewRollback(param.Tid, param.CustomTimeField)
		}
	}()
	var (
		viewSQL string
	)
	jsonExtractSQL := ""
	if param.Tid != 0 {
		jsonExtractSQL = c.genJsonExtractSQLV3(param.Indexes)
	}
	dName := genName(databaseInfo.Name, param.Table)
	streamName := genStreamName(databaseInfo.Name, param.Table)
	// drop
	viewDropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s;", viewName)
	if c.mode == ModeCluster {
		if databaseInfo.Cluster == "" {
			err = constx.ErrClusterNameEmpty
			return
		}
		viewDropSQL = fmt.Sprintf("DROP TABLE IF EXISTS %s ON CLUSTER `%s` ;", viewName, databaseInfo.Cluster)
	}
	_, err = c.db.Exec(viewDropSQL)
	if err != nil {
		elog.Error("viewOperator", elog.String("viewDropSQL", viewDropSQL), elog.String("jsonExtractSQL", jsonExtractSQL), elog.String("viewName", viewName), elog.String("cluster", databaseInfo.Cluster))
		return "", err
	}
	// create
	var timeConv string
	var whereCond string
	if param.CustomTimeField == "" {
		timeConv = c.timeParseSQLV3(param.Typ, nil, param.TimeField)
		whereCond = c.whereConditionSQLDefaultV3(param.List)
	} else {
		if param.Current == nil {
			return "", errors.New("the process processes abnormal data errors, current view cannot be nil")
		}
		timeConv = c.timeParseSQLV3(param.Typ, param.Current, param.TimeField)
		whereCond = c.whereConditionSQLCurrentV3(param.Current)
	}
	viewSQL = c.ViewDo(bumo.Params{
		TableCreateType: constx.TableCreateTypeUBW,
		TimeField:       param.TimeField,
		Cluster:         databaseInfo.Cluster,
		ReplicaStatus:   c.rs,
		View: bumo.ParamsView{
			ViewTable:        viewName,
			TargetTable:      dName,
			TimeConvert:      timeConv,
			CommonFields:     jsonExtractSQL,
			SourceTable:      streamName,
			Where:            whereCond,
			IsKafkaTimestamp: param.IsKafkaTimestamp,
		},
	})
	if param.IsCreate {
		_, err = c.db.Exec(viewSQL)
		if err != nil {
			return viewSQL, err
		}
	}
	return viewSQL, nil
}

func (c *ClickHouse) genJsonExtractSQLV3(indexes map[string]*db.BaseIndex) string {
	rawLogField := constx.UBWKafkaStreamField
	jsonExtractSQL := ",\n"
	for _, obj := range indexes {
		if obj.RootName == "" {
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(%s, '%s')) AS `%s`,\n", rawLogField, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(%s, '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.Field, obj.GetFieldName())
		} else {
			if hashFieldName, ok := obj.GetHashFieldName(); ok {
				switch obj.HashTyp {
				case db.HashTypeSip:
					jsonExtractSQL += fmt.Sprintf("sipHash64(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				case db.HashTypeURL:
					jsonExtractSQL += fmt.Sprintf("URLHash(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, hashFieldName)
				}
			}
			if obj.Typ == 0 {
				jsonExtractSQL += fmt.Sprintf("toNullable(JSONExtractString(JSONExtractString(%s, '%s'), '%s')) AS `%s`,\n", rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
				continue
			}
			jsonExtractSQL += fmt.Sprintf("%s(replaceAll(JSONExtractRaw(JSONExtractString(%s, '%s'), '%s'), '\"', '')) AS `%s`,\n", jsonExtractORM[obj.Typ], rawLogField, obj.RootName, obj.Field, obj.GetFieldName())
		}
	}
	jsonExtractSQL = strings.TrimSuffix(jsonExtractSQL, ",\n")
	return jsonExtractSQL
}

func (c *ClickHouse) whereConditionSQLCurrentV3(current *db.BaseView) string {
	rawLogField := constx.UBWKafkaStreamField
	if current == nil {
		return "1=1"
	}
	return fmt.Sprintf("JSONHas(%s, '%s') = 1", rawLogField, current.Key)
}

func (c *ClickHouse) whereConditionSQLDefaultV3(list []*db.BaseView) string {
	rawLogField := constx.UBWKafkaStreamField
	if list == nil {
		return "1=1"
	}
	var defaultSQL string
	// It is required to obtain all the view parameters under the current table and construct the default and current view query conditions
	for k, viewRow := range list {
		if k == 0 {
			defaultSQL = fmt.Sprintf("JSONHas(%s, '%s') = 0", rawLogField, viewRow.Key)
		} else {
			defaultSQL = fmt.Sprintf("%s AND JSONHas(%s, '%s') = 0", defaultSQL, rawLogField, viewRow.Key)
		}
	}
	if defaultSQL == "" {
		return "1=1"
	}
	return defaultSQL
}

func (c *ClickHouse) timeParseSQLV3(typ int, v *db.BaseView, timeField string) string {
	rawLogField := constx.UBWKafkaStreamField
	if timeField == "" {
		timeField = "_time_"
	}
	if v != nil && v.Format == "fromUnixTimestamp64Micro" && v.IsUseDefaultTime == 0 {
		return fmt.Sprintf(nanosecondTimeParse, rawLogField, v.Key, rawLogField, v.Key)
	}
	if typ == TableTypeString {
		return fmt.Sprintf(defaultStringTimeParseV3, rawLogField, timeField, rawLogField, timeField)
	}
	return fmt.Sprintf(defaultFloatTimeParseV3, rawLogField, timeField, rawLogField, timeField)
}
