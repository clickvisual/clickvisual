package querytoken

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func sqliteTokenTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	d, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	SetDBForTest(d)
	require.NoError(t, ensureSchema())
	return d
}

func TestCreateValidateGrantAndDisableToken(t *testing.T) {
	sqliteTokenTestDB(t)

	created, err := Create(view.ReqQueryTokenCreate{
		Name:     "robot",
		Desc:     "ci query",
		ExpireAt: 1999999999,
		TableIDs: []int{7, 7, 8},
	}, 1)
	require.NoError(t, err)
	require.NotEmpty(t, created.Token)
	assert.Equal(t, "robot", created.Name)
	assert.Equal(t, []int{7, 8}, created.TableIDs)
	assert.NotEqual(t, created.Token, created.TokenPrefix)

	principal, err := Validate(created.Token)
	require.NoError(t, err)
	assert.Equal(t, created.ID, principal.Token.ID)

	allowed, err := HasTablePermission(created.ID, 7)
	require.NoError(t, err)
	assert.True(t, allowed)
	allowed, err = HasTablePermission(created.ID, 9)
	require.NoError(t, err)
	assert.False(t, allowed)

	_, err = Update(created.ID, view.ReqQueryTokenUpdate{Status: dbmodel.QueryTokenStatusDisabled})
	require.NoError(t, err)
	_, err = Validate(created.Token)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "disabled")
}

func TestRecordAudit(t *testing.T) {
	d := sqliteTokenTestDB(t)

	created, err := Create(view.ReqQueryTokenCreate{Name: "robot", TableIDs: []int{7}}, 1)
	require.NoError(t, err)
	principal, err := Validate(created.Token)
	require.NoError(t, err)

	RecordAudit(AuditInput{
		Token: principal.Token,
		Table: dbmodel.BaseTable{
			BaseModel: dbmodel.BaseModel{ID: 7},
			Name:      "app_stdout",
			Database:  &dbmodel.BaseDatabase{Name: "dev_log"},
		},
		Request: view.QueryRequestV2{
			Tid:      7,
			ST:       100,
			ET:       200,
			Page:     1,
			PageSize: 20,
		},
		ResultCount: 3,
		CostMs:      12,
		Status:      AuditStatusSuccess,
		ClientIP:    "127.0.0.1",
		UserAgent:   "test",
	})

	var count int64
	require.NoError(t, d.Model(&dbmodel.QueryTokenAudit{}).Count(&count).Error)
	assert.EqualValues(t, 1, count)

	total, audits, err := ListAudits(view.ReqQueryTokenAuditList{TokenID: created.ID})
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	require.Len(t, audits, 1)
	assert.Equal(t, "dev_log", audits[0].DatabaseName)
	assert.Equal(t, "app_stdout", audits[0].TableName)
	assert.Equal(t, uint64(3), audits[0].ResultCount)
}

func TestExtractBearerToken(t *testing.T) {
	assert.Equal(t, "abc", ExtractBearerToken("Bearer abc", ""))
	assert.Equal(t, "abc", ExtractBearerToken("abc", ""))
	assert.Equal(t, "fallback", ExtractBearerToken("", "fallback"))
}
