package querytoken

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"gorm.io/gorm"
)

const (
	tokenPrefix = "cvqt_"

	AuditStatusSuccess = "success"
	AuditStatusFailed  = "failed"
)

var (
	schemaOnce sync.Once
	schemaErr  error
	testDB     *gorm.DB
)

type Principal struct {
	Token dbmodel.QueryToken
}

type AuditInput struct {
	Token        dbmodel.QueryToken
	Table        dbmodel.BaseTable
	Request      view.QueryRequestV2
	ResultCount  uint64
	CostMs       int64
	Status       string
	ErrorMessage string
	ClientIP     string
	UserAgent    string
}

func SetDBForTest(d *gorm.DB) {
	testDB = d
	schemaOnce = sync.Once{}
	schemaErr = nil
}

func Create(req view.ReqQueryTokenCreate, operatorID int) (view.RespQueryToken, error) {
	if err := ensureSchema(); err != nil {
		return view.RespQueryToken{}, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return view.RespQueryToken{}, fmt.Errorf("name 不能为空")
	}
	plainToken, err := generateToken()
	if err != nil {
		return view.RespQueryToken{}, err
	}
	model := dbmodel.QueryToken{
		Name:        name,
		TokenHash:   HashToken(plainToken),
		TokenPrefix: tokenVisiblePrefix(plainToken),
		Status:      dbmodel.QueryTokenStatusEnabled,
		ExpireAt:    req.ExpireAt,
		CreatedBy:   operatorID,
		Desc:        strings.TrimSpace(req.Desc),
	}
	if err = currentDB().Create(&model).Error; err != nil {
		return view.RespQueryToken{}, err
	}
	if err = ReplaceGrants(model.ID, req.TableIDs); err != nil {
		return view.RespQueryToken{}, err
	}
	resp, err := toResp(model)
	if err != nil {
		return view.RespQueryToken{}, err
	}
	resp.Token = plainToken
	return resp, nil
}

func List() ([]view.RespQueryToken, error) {
	if err := ensureSchema(); err != nil {
		return nil, err
	}
	var items []dbmodel.QueryToken
	if err := currentDB().Order("id desc").Find(&items).Error; err != nil {
		return nil, err
	}
	resp := make([]view.RespQueryToken, 0, len(items))
	for _, item := range items {
		row, err := toResp(item)
		if err != nil {
			return nil, err
		}
		resp = append(resp, row)
	}
	return resp, nil
}

func Update(id int, req view.ReqQueryTokenUpdate) (view.RespQueryToken, error) {
	if err := ensureSchema(); err != nil {
		return view.RespQueryToken{}, err
	}
	if id <= 0 {
		return view.RespQueryToken{}, fmt.Errorf("invalid token id")
	}
	var model dbmodel.QueryToken
	if err := currentDB().First(&model, id).Error; err != nil {
		return view.RespQueryToken{}, err
	}
	updates := map[string]interface{}{}
	if strings.TrimSpace(req.Name) != "" {
		updates["name"] = strings.TrimSpace(req.Name)
	}
	if req.Status != 0 {
		if req.Status != dbmodel.QueryTokenStatusEnabled && req.Status != dbmodel.QueryTokenStatusDisabled {
			return view.RespQueryToken{}, fmt.Errorf("invalid token status")
		}
		updates["status"] = req.Status
	}
	updates["desc"] = strings.TrimSpace(req.Desc)
	updates["expire_at"] = req.ExpireAt
	if err := currentDB().Model(&model).Updates(updates).Error; err != nil {
		return view.RespQueryToken{}, err
	}
	if err := currentDB().First(&model, id).Error; err != nil {
		return view.RespQueryToken{}, err
	}
	return toResp(model)
}

func ReplaceGrants(tokenID int, tableIDs []int) error {
	if err := ensureSchema(); err != nil {
		return err
	}
	if tokenID <= 0 {
		return fmt.Errorf("invalid token id")
	}
	uniq := make(map[int]struct{}, len(tableIDs))
	grants := make([]dbmodel.QueryTokenGrant, 0, len(tableIDs))
	for _, tid := range tableIDs {
		if tid <= 0 {
			continue
		}
		if _, ok := uniq[tid]; ok {
			continue
		}
		uniq[tid] = struct{}{}
		grants = append(grants, dbmodel.QueryTokenGrant{TokenID: tokenID, Tid: tid})
	}
	return currentDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("token_id = ?", tokenID).Delete(&dbmodel.QueryTokenGrant{}).Error; err != nil {
			return err
		}
		if len(grants) == 0 {
			return nil
		}
		return tx.Create(&grants).Error
	})
}

func Validate(rawToken string) (Principal, error) {
	if err := ensureSchema(); err != nil {
		return Principal{}, err
	}
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return Principal{}, fmt.Errorf("token is required")
	}
	var token dbmodel.QueryToken
	if err := currentDB().Where("token_hash = ?", HashToken(rawToken)).First(&token).Error; err != nil {
		return Principal{}, fmt.Errorf("invalid token")
	}
	if token.Status != dbmodel.QueryTokenStatusEnabled {
		return Principal{}, fmt.Errorf("token is disabled")
	}
	if token.ExpireAt > 0 && token.ExpireAt < time.Now().Unix() {
		return Principal{}, fmt.Errorf("token is expired")
	}
	return Principal{Token: token}, nil
}

func HasTablePermission(tokenID int, tid int) (bool, error) {
	if err := ensureSchema(); err != nil {
		return false, err
	}
	if tokenID <= 0 || tid <= 0 {
		return false, nil
	}
	var count int64
	if err := currentDB().Model(&dbmodel.QueryTokenGrant{}).
		Where("token_id = ? AND tid = ?", tokenID, tid).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func Touch(tokenID int) {
	if tokenID <= 0 || currentDB() == nil {
		return
	}
	_ = currentDB().Model(&dbmodel.QueryToken{}).Where("id = ?", tokenID).Update("last_used_at", time.Now().Unix()).Error
}

func RecordAudit(input AuditInput) {
	if input.Token.ID <= 0 || currentDB() == nil {
		return
	}
	queryBytes, _ := json.Marshal(input.Request)
	databaseName := ""
	tableName := ""
	if input.Table.Database != nil {
		databaseName = input.Table.Database.Name
	}
	tableName = input.Table.Name
	_ = currentDB().Create(&dbmodel.QueryTokenAudit{
		TokenID:      input.Token.ID,
		TokenName:    input.Token.Name,
		Tid:          input.Request.Tid,
		DatabaseName: databaseName,
		TableNameRef: tableName,
		QueryJSON:    string(queryBytes),
		ST:           input.Request.ST,
		ET:           input.Request.ET,
		Page:         input.Request.Page,
		PageSize:     input.Request.PageSize,
		ResultCount:  input.ResultCount,
		CostMs:       input.CostMs,
		Status:       input.Status,
		ErrorMessage: input.ErrorMessage,
		ClientIP:     input.ClientIP,
		UserAgent:    trimForDB(input.UserAgent, 255),
	}).Error
}

func ListAudits(req view.ReqQueryTokenAuditList) (int64, []view.RespQueryTokenAudit, error) {
	if err := ensureSchema(); err != nil {
		return 0, nil, err
	}
	if req.Current <= 0 {
		req.Current = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	query := currentDB().Model(&dbmodel.QueryTokenAudit{})
	if req.TokenID > 0 {
		query = query.Where("token_id = ?", req.TokenID)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return 0, nil, err
	}
	var items []dbmodel.QueryTokenAudit
	if err := query.Order("id desc").Offset((req.Current - 1) * req.PageSize).Limit(req.PageSize).Find(&items).Error; err != nil {
		return 0, nil, err
	}
	resp := make([]view.RespQueryTokenAudit, 0, len(items))
	for _, item := range items {
		resp = append(resp, view.RespQueryTokenAudit{
			ID:           item.ID,
			TokenID:      item.TokenID,
			TokenName:    item.TokenName,
			Tid:          item.Tid,
			DatabaseName: item.DatabaseName,
			TableName:    item.TableNameRef,
			QueryJSON:    item.QueryJSON,
			ST:           item.ST,
			ET:           item.ET,
			Page:         item.Page,
			PageSize:     item.PageSize,
			ResultCount:  item.ResultCount,
			CostMs:       item.CostMs,
			Status:       item.Status,
			ErrorMessage: item.ErrorMessage,
			ClientIP:     item.ClientIP,
			UserAgent:    item.UserAgent,
			Ctime:        item.Ctime,
		})
	}
	return total, resp, nil
}

func ExtractBearerToken(authorization string, fallback string) string {
	authorization = strings.TrimSpace(authorization)
	if authorization == "" {
		return strings.TrimSpace(fallback)
	}
	parts := strings.Fields(authorization)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}
	return authorization
}

func HashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(rawToken)))
	return hex.EncodeToString(sum[:])
}

func ensureSchema() error {
	schemaOnce.Do(func() {
		if currentDB() == nil {
			schemaErr = fmt.Errorf("db is nil")
			return
		}
		d := currentDB()
		if testDB == nil {
			d = d.Set("gorm:table_options", "ENGINE=InnoDB")
		}
		schemaErr = d.AutoMigrate(
			&dbmodel.QueryToken{},
			&dbmodel.QueryTokenGrant{},
			&dbmodel.QueryTokenAudit{},
		)
	})
	return schemaErr
}

func currentDB() *gorm.DB {
	if testDB != nil {
		return testDB
	}
	return invoker.Db
}

func generateToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return tokenPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

func tokenVisiblePrefix(token string) string {
	if len(token) <= 12 {
		return token
	}
	return token[:12]
}

func toResp(model dbmodel.QueryToken) (view.RespQueryToken, error) {
	tableIDs, err := tableIDsForToken(model.ID)
	if err != nil {
		return view.RespQueryToken{}, err
	}
	return view.RespQueryToken{
		ID:          model.ID,
		Name:        model.Name,
		TokenPrefix: model.TokenPrefix,
		Status:      model.Status,
		ExpireAt:    model.ExpireAt,
		LastUsedAt:  model.LastUsedAt,
		CreatedBy:   model.CreatedBy,
		Desc:        model.Desc,
		Ctime:       model.Ctime,
		Utime:       model.Utime,
		TableIDs:    tableIDs,
	}, nil
}

func tableIDsForToken(tokenID int) ([]int, error) {
	var grants []dbmodel.QueryTokenGrant
	if err := currentDB().Where("token_id = ?", tokenID).Order("tid asc").Find(&grants).Error; err != nil {
		return nil, err
	}
	tableIDs := make([]int, 0, len(grants))
	for _, grant := range grants {
		tableIDs = append(tableIDs, grant.Tid)
	}
	return tableIDs, nil
}

func trimForDB(value string, maxLen int) string {
	if len(value) <= maxLen {
		return value
	}
	return value[:maxLen]
}
