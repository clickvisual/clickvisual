package shorturl

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

type shareTableIDResolver func(url.Values) int

func Clean() {
	for {
		time.Sleep(time.Minute * 10)
		db.ShortURLDelete30Days()
	}
}

func GenShortURL(ur string) (string, error) {
	u2, err := normalizeOriginURL(ur, resolveShareTableID)
	if err != nil {
		return "", err
	}
	// 判断是否存在相同的记录
	existShortURL, _ := db.ShortURLInfoByURL(invoker.Db, u2)
	if existShortURL.ID != 0 {
		return fmt.Sprintf("%s/api/share/%s", strings.TrimSuffix(econf.GetString("app.rootURL"), "/"), existShortURL.SCode), nil
	}
	shortUrl := db.BaseShortURL{
		OriginUrl: u2,
		SCode:     uuid.New().String(),
		CallCnt:   0,
	}
	tx := invoker.Db.Begin()
	if err = db.ShortURLCreate(tx, &shortUrl); err != nil {
		tx.Rollback()
		return "", errors.Wrap(err, "ShortURLCreate short url error")
	}
	sCode := fmt.Sprintf("%010d", shortUrl.ID)
	if err = db.ShortURLUpdate(tx, shortUrl.ID, map[string]interface{}{"s_code": sCode}); err != nil {
		tx.Rollback()
		return "", errors.Wrap(err, "ShortURLUpdate short url error")
	}
	if err = tx.Commit().Error; err != nil {
		return "", errors.Wrap(err, "tx commit error")
	}
	rootUrl := strings.TrimSuffix(econf.GetString("app.rootURL"), "/")
	short := fmt.Sprintf("%s/api/share/%s", rootUrl, sCode)
	elog.Info("GenShortURL", elog.String("short", short), elog.String("originUrl", u2))
	return short, nil
}

func NormalizeRedirectURL(ur string) string {
	u2, err := normalizeOriginURL(ur, resolveShareTableID)
	if err != nil {
		return ur
	}
	return u2
}

func normalizeOriginURL(ur string, resolveTableID shareTableIDResolver) (string, error) {
	u, err := url.Parse(ur)
	if err != nil {
		return "", fmt.Errorf("url parse error: %w", err)
	}
	v := u.Query()
	normalizeShareTimeParams(v)
	normalizeShareQueryParams(v)
	normalizeShareTableParams(v, resolveTableID)
	v.Set("tab", "custom")
	u.RawQuery = v.Encode()
	u.Fragment = ""
	return u.String(), nil
}

func normalizeShareTimeParams(values url.Values) {
	if values.Get("start") != "" && values.Get("end") != "" {
		return
	}
	start := parseShareDateTime(values.Get("startTime"))
	end := parseShareDateTime(values.Get("endTime"))
	if start <= 0 || end <= start {
		return
	}
	values.Set("start", strconv.FormatInt(start, 10))
	values.Set("end", strconv.FormatInt(end, 10))
	values.Del("startTime")
	values.Del("endTime")
}

func parseShareDateTime(value string) int64 {
	rawValue := strings.TrimSpace(value)
	if rawValue == "" {
		return 0
	}
	if unix, err := strconv.ParseInt(rawValue, 10, 64); err == nil && unix > 0 {
		return unix
	}
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
	}
	for _, layout := range layouts {
		parsed, err := time.ParseInLocation(layout, rawValue, time.Local)
		if err == nil {
			return parsed.Unix()
		}
	}
	return 0
}

func normalizeShareQueryParams(values url.Values) {
	if values.Get("kw") != "" {
		return
	}
	query := strings.TrimSpace(values.Get("query"))
	if query != "" {
		values.Set("kw", query)
	}
}

func normalizeShareTableParams(values url.Values, resolveTableID shareTableIDResolver) {
	if values.Get("tid") != "" {
		return
	}
	if tableID := parsePositiveInt(values.Get("tableId")); tableID > 0 {
		values.Set("tid", strconv.Itoa(tableID))
		return
	}
	if resolveTableID == nil {
		return
	}
	if strings.TrimSpace(values.Get("database")) == "" || strings.TrimSpace(values.Get("table")) == "" {
		return
	}
	tableID := resolveTableID(values)
	if tableID > 0 {
		values.Set("tid", strconv.Itoa(tableID))
	}
}

func resolveShareTableID(values url.Values) int {
	databaseName := strings.TrimSpace(values.Get("database"))
	tableName := strings.TrimSpace(values.Get("table"))
	if databaseName == "" || tableName == "" {
		return 0
	}
	query := invoker.Db.Table(db.TableNameBaseTable+" AS t").
		Select("t.id").
		Joins("JOIN "+db.TableNameBaseDatabase+" AS d ON d.id = t.did").
		Where("d.name = ? AND t.name = ? AND d.dtime = 0 AND t.dtime = 0", databaseName, tableName).
		Order("t.id ASC")
	instanceID := parsePositiveInt(values.Get("instanceId"))
	if instanceID == 0 {
		instanceID = parsePositiveInt(values.Get("iid"))
	}
	if instanceID > 0 {
		query = query.Where("d.iid = ?", instanceID)
	}
	var result struct {
		ID int
	}
	if err := query.First(&result).Error; err != nil {
		return 0
	}
	return result.ID
}

func parsePositiveInt(value string) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return 0
	}
	return parsed
}
