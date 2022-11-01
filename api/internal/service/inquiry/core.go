package inquiry

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

const (
	TableTypeString = 1
	TableTypeFloat  = 2
)

var (
	skipLikeAddStepWords = []string{"=", "like", ">", "<", "has(", ")"}
	queryOperatorArr     = []string{"=", "!=", "<", "<=", ">", ">=", "like"}
)

type Operator interface {
	Conn() *sql.DB
	Count(view.ReqQuery) (uint64, error)
	GroupBy(view.ReqQuery) map[string]uint64
	DoSQL(string) (view.RespComplete, error)
	Prepare(view.ReqQuery, bool) (view.ReqQuery, error)
	SyncView(db.BaseTable, *db.BaseView, []*db.BaseView, bool) (string, string, error)

	CreateDatabase(string, string) error
	CreateAlertView(string, string, string) error
	CreateKafkaTable(*db.BaseTable, view.ReqStorageUpdate) (string, error)
	CreateTraceJaegerDependencies(database, cluster, table string, ttl int) (err error)
	CreateTable(int, db.BaseDatabase, view.ReqTableCreate) (string, string, string, string, error)
	CreateStorage(int, db.BaseDatabase, view.ReqStorageCreate) (string, string, string, string, error)
	CreateStorageV3(int, db.BaseDatabase, view.ReqStorageCreateV3) (string, string, string, string, error)

	UpdateIndex(db.BaseDatabase, db.BaseTable, map[string]*db.BaseIndex, map[string]*db.BaseIndex, map[string]*db.BaseIndex) error
	UpdateMergeTreeTable(*db.BaseTable, view.ReqStorageUpdate) error

	GetLogs(view.ReqQuery, int) (view.RespQuery, error)
	GetCreateSQL(database, table string) (string, error)
	GetAlertViewSQL(*db.Alarm, db.BaseTable, int, string) (string, string, error)
	GetTraceGraph(ctx context.Context) ([]view.RespJaegerDependencyDataModel, error)

	ListSystemTable() []*view.SystemTables
	ListSystemCluster() ([]*view.SystemClusters, map[string]*view.SystemClusters, error)
	ListDatabase() ([]*view.RespDatabaseSelfBuilt, error)
	ListColumn(string, string, bool) ([]*view.RespColumn, error)

	DeleteDatabase(string, string) error
	DeleteAlertView(string, string) error
	DeleteTable(string, string, string, int) error
	DeleteTraceJaegerDependencies(database, cluster, table string) (err error)
}

func genName(database, tableName string) string {
	return fmt.Sprintf("`%s`.`%s`", database, tableName)
}

func genNameWithMode(clusterMode int, database, tableName string) string {
	if clusterMode == ModeCluster {
		return fmt.Sprintf("`%s`.`%s_local`", database, tableName)
	}
	return fmt.Sprintf("`%s`.`%s`", database, tableName)
}

func genSQLClusterInfo(clusterMode int, clusterName string) string {
	if clusterMode == ModeCluster {
		return fmt.Sprintf(" ON CLUSTER `%s`", clusterName)
	}
	return ""
}

func genStreamName(database, tableName string) string {
	return fmt.Sprintf("`%s`.`%s_stream`", database, tableName)
}

func genStreamNameWithMode(clusterMode int, database, tableName string) string {
	if clusterMode == ModeCluster {
		return fmt.Sprintf("`%s`.`%s_local_stream`", database, tableName)
	}
	return fmt.Sprintf("`%s`.`%s_stream`", database, tableName)
}

func genViewName(database, tableName string, timeKey string) string {
	if timeKey == "" {
		return fmt.Sprintf("`%s`.`%s_view`", database, tableName)
	}
	return fmt.Sprintf("`%s`.`%s_%s_view`", database, tableName, timeKey)
}

type queryItem struct {
	Key      string
	Operator string
	Value    string
}

func queryTransformer(in string) (out string, err error) {
	items := make([]queryItem, 0)
	items, err = queryEncode(in)
	if err != nil {
		return
	}
	out = queryDecode(items)
	return
}

func queryEncode(in string) ([]queryItem, error) {
	res := make([]queryItem, 0)
	for _, a := range strings.Split(in, "' and ") {
		for _, op := range queryOperatorArr {
			if err := queryEncodeOperation(a, op, &res); err != nil {
				return nil, err
			}
		}
	}
	return res, nil
}

func queryDecode(in []queryItem) (out string) {
	for index, item := range in {
		if item.Key == db.TimeFieldSecond {
			item.Value = fmt.Sprintf("'%d'", dayTime2Timestamp(item.Value, "'2006-01-02T15:04:05+08:00'"))
		}
		if index == 0 {
			out = fmt.Sprintf("%s%s%s", item.Key, item.Operator, item.Value)
		} else {
			out = fmt.Sprintf("%s and %s%s%s", out, item.Key, item.Operator, item.Value)
		}
	}
	return
}

func dayTime2Timestamp(in string, layout string) int64 {
	if layout == "" {
		layout = "2006-01-02 15:04:05"
	}
	loc, _ := time.LoadLocation("Local")
	theTime, _ := time.ParseInLocation(layout, in, loc)
	return theTime.Unix()
}

func queryEncodeOperation(a string, op string, res *[]queryItem) error {
	if !strings.Contains(a, op) {
		return nil
	}
	opArr := strings.SplitN(strings.TrimSpace(a), op, 2)
	if len(opArr) != 2 {
		return constx.ErrQueryFormatIllegal
	}
	val := opArr[1]
	if strings.Contains(val, "'") {
		val = strings.TrimSuffix(val, "'") + "'"
	}
	*res = append(*res, queryItem{
		Key:      opArr[0],
		Operator: op,
		Value:    val,
	})
	return nil
}
