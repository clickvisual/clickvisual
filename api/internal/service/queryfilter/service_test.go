package queryfilter

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func sqliteTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	d, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	return d
}

func TestQueryFilterProfileTableName(t *testing.T) {
	assert.Equal(t, dbmodel.TableNameQueryFilterProfile, (&dbmodel.QueryFilterProfile{}).TableName())
}

func TestCreateAndListQueryFilterProfiles(t *testing.T) {
	d := sqliteTestDB(t)
	require.NoError(t, d.AutoMigrate(&dbmodel.QueryFilterProfile{}))

	profile := dbmodel.QueryFilterProfile{
		Name:           "gateway timeout",
		InstanceID:     1,
		InstanceName:   "prod clickhouse",
		DatabaseName:   "default",
		TableNameRef:   "logs",
		StartTime:      time.Date(2026, 4, 21, 8, 30, 0, 0, time.UTC),
		EndTime:        time.Date(2026, 4, 21, 9, 30, 0, 0, time.UTC),
		ConditionsJSON: `[{"id":"cond_1","field":"service","operator":"=","value":"gateway","valueType":"string"}]`,
		Creator:        "tester",
		Updater:        "tester",
	}

	require.NoError(t, d.Create(&profile).Error)
	require.NotZero(t, profile.ID)

	var got []dbmodel.QueryFilterProfile
	require.NoError(t, d.Where("instance_id = ? AND database_name = ? AND table_name = ?", 1, "default", "logs").Find(&got).Error)
	require.Len(t, got, 1)
	assert.Equal(t, "gateway timeout", got[0].Name)
	assert.Equal(t, "logs", got[0].TableNameRef)
}

func TestCreateQueryFilter(t *testing.T) {
	ResetForTest()
	resp, err := Create(baseReq("gateway timeout"), "tester")
	require.NoError(t, err)
	assert.Equal(t, 1, resp.ID)
	assert.Equal(t, "gateway timeout", resp.Name)
	assert.Equal(t, "tester", resp.Creator)
}

func TestCreateQueryFilterValidation(t *testing.T) {
	ResetForTest()

	_, err := Create(baseReq(""), "tester")
	require.Error(t, err)
	assert.Equal(t, "name 不能为空", err.Error())

	req := baseReq("gateway timeout")
	req.Conditions = nil
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "conditions 不能为空", err.Error())

	req = baseReq("gateway timeout")
	req.TimeRange.StartTime = "bad-time"
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "invalid startTime", err.Error())

	req = baseReq("gateway timeout")
	req.TimeRange.EndTime = "2026-04-21T07:30"
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "endTime MUST be greater than startTime", err.Error())

	req = baseReq("gateway timeout")
	req.InstanceID = -1
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "instanceId 不能为空", err.Error())

	req = baseReq("gateway timeout")
	req.InstanceName = ""
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "instanceName 不能为空", err.Error())

	req = baseReq("gateway timeout")
	req.Database = ""
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "database 不能为空", err.Error())

	req = baseReq("gateway timeout")
	req.Table = ""
	_, err = Create(req, "tester")
	require.Error(t, err)
	assert.Equal(t, "table 不能为空", err.Error())
}

func TestQueryFilterCRUDWithMemoryStore(t *testing.T) {
	ResetForTest()

	created, err := Create(baseReq("gateway timeout"), "tester")
	require.NoError(t, err)

	list, err := List(view.ReqQueryFilterList{
		InstanceID: 1,
		Database:   "default",
		Table:      "logs",
	})
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.Equal(t, created.ID, list[0].ID)

	got, err := Get(created.ID)
	require.NoError(t, err)
	assert.Equal(t, "gateway timeout", got.Name)

	updatedReq := baseReq("gateway timeout v2")
	updatedReq.Conditions[0].Value = "gateway-v2"
	updated, err := Update(created.ID, updatedReq, "tester2")
	require.NoError(t, err)
	assert.Equal(t, "gateway timeout v2", updated.Name)
	assert.Equal(t, "tester2", updated.Updater)

	_, err = Delete(created.ID)
	require.NoError(t, err)
	_, err = Get(created.ID)
	require.Error(t, err)
	assert.Equal(t, "filter not found: 1", err.Error())
}

func TestQueryFilterCRUDWithDBStore(t *testing.T) {
	ResetForTest()
	d := sqliteTestDB(t)
	require.NoError(t, d.AutoMigrate(&dbmodel.QueryFilterProfile{}))
	SetDBForTest(d)
	t.Cleanup(ResetForTest)

	created, err := Create(baseReq("gateway timeout"), "tester")
	require.NoError(t, err)
	require.NotZero(t, created.ID)

	got, err := Get(created.ID)
	require.NoError(t, err)
	assert.Equal(t, "gateway timeout", got.Name)

	updatedReq := baseReq("gateway timeout v2")
	updatedReq.Conditions[0].Value = "gateway-v2"
	updated, err := Update(created.ID, updatedReq, "tester2")
	require.NoError(t, err)
	assert.Equal(t, "gateway timeout v2", updated.Name)
	assert.Equal(t, "tester2", updated.Updater)

	list, err := List(view.ReqQueryFilterList{
		InstanceID: 1,
		Database:   "default",
		Table:      "logs",
	})
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.Equal(t, created.ID, list[0].ID)

	_, err = Delete(created.ID)
	require.NoError(t, err)
	_, err = Get(created.ID)
	require.Error(t, err)
	assert.Equal(t, fmt.Sprintf("filter not found: %d", created.ID), err.Error())
}

func TestParseTimeTreatsMinuteLayoutAsLocalTime(t *testing.T) {
	got, err := parseTime("2026-04-21T08:30")
	require.NoError(t, err)
	assert.Equal(t, time.Local, got.Location())
	assert.Equal(t, 8, got.Hour())
	assert.Equal(t, 30, got.Minute())
}

func baseReq(name string) view.ReqQueryFilterUpsert {
	return view.ReqQueryFilterUpsert{
		Name:         name,
		InstanceID:   1,
		InstanceName: "prod clickhouse",
		Database:     "default",
		Table:        "logs",
		TimeRange: view.QueryFilterTimeRange{
			StartTime: "2026-04-21T08:30",
			EndTime:   "2026-04-21T09:30",
		},
		Conditions: []view.QueryFilterCondition{
			{ID: "cond_1", Field: "service", Operator: "=", Value: "gateway", ValueType: "string"},
		},
	}
}
