package inquiry

import (
	"fmt"
	"strings"
	"time"

	"github.com/clickvisual/clickvisual/api/pkg/constx"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type Operator interface {
	Prepare(view.ReqQuery, bool) (view.ReqQuery, error) // Request Parameter Preprocessing

	GET(view.ReqQuery, int) (view.RespQuery, error)
	Count(view.ReqQuery) (uint64, error)
	GroupBy(view.ReqQuery) map[string]uint64
	Complete(string) (view.RespComplete, error)

	TableDrop(string, string, string, int) error
	DropDatabase(string, string) error
	AlertViewDrop(string, string) error

	StorageCreate(int, db.BaseDatabase, view.ReqStorageCreate) (string, string, string, string, error)
	TableCreate(int, db.BaseDatabase, view.ReqTableCreate) (string, string, string, string, error)
	DatabaseCreate(string, string) error
	AlertViewCreate(string, string, string) error
	AlertViewGen(*db.Alarm, string) (string, string, error)

	Columns(string, string, bool) ([]*view.RespColumn, error)
	Databases() ([]*view.RespDatabaseSelfBuilt, error)

	ViewSync(db.BaseTable, *db.BaseView, []*db.BaseView, bool) (string, string, error)
	SystemTablesInfo() []*view.SystemTable
	AlterMergeTreeTable(*db.BaseTable, view.ReqStorageUpdate) error
	ReCreateKafkaTable(*db.BaseTable, view.ReqStorageUpdate) (string, error)
	IndexUpdate(db.BaseDatabase, db.BaseTable, map[string]*db.BaseIndex, map[string]*db.BaseIndex, map[string]*db.BaseIndex) error // Data table index operation

	StorageCreateV3(int, db.BaseDatabase, view.ReqStorageCreateV3) (string, string, string, string, error)
}

const (
	TableTypeString = 1
	TableTypeFloat  = 2
)

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

var queryOperatorArr = []string{"=", "!=", "<", "<=", ">", ">=", "like"}

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
