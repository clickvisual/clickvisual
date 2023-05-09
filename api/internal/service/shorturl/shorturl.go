package shorturl

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func hashIDGenCode(id int) string {
	ret, err := invoker.HashId.EncodeInt64([]int64{int64(id)})
	if err != nil {
		elog.Error("gen error", elog.FieldErr(err))
	}
	return ret
}

func ShortURLClean() {
	for {
		time.Sleep(time.Minute * 10)
		db.ShortURLDelete30Days()
	}
}

func GenShortURL(ur string) (string, error) {
	u, err := url.Parse(ur)
	if err != nil {
		return "", errors.New(err.Error())
	}
	v := u.Query()
	v.Set("tab", "custom")
	u2 := fmt.Sprintf("%s://%s%s?%s", u.Scheme, u.Host, u.Path, v.Encode())
	shortUrl := db.BaseShortURL{
		OriginUrl: u2,
		SCode:     "",
		CallCnt:   0,
	}
	tx := invoker.Db.Begin()
	if err = db.ShortURLCreate(tx, &shortUrl); err != nil {
		tx.Rollback()
		return "", errors.Wrap(err, "ShortURLCreate short url error")
	}
	sCode := hashIDGenCode(shortUrl.ID)
	if err = db.ShortURLUpdate(tx, shortUrl.ID, map[string]interface{}{"s_code": sCode}); err != nil {
		tx.Rollback()
		return "", errors.Wrap(err, "ShortURLUpdate short url error")
	}
	if err = tx.Commit().Error; err != nil {
		return "", errors.Wrap(err, "tx commit error")
	}
	rootUrl := strings.TrimSuffix(econf.GetString("app.rootURL"), "/")
	return fmt.Sprintf("%s/api/share/%s", rootUrl, sCode), nil
}
