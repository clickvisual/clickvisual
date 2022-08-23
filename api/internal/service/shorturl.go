package service

import (
	"time"

	"github.com/gotomicro/ego/core/elog"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func HashIDGenCode(id int) string {
	ret, err := invoker.HashId.EncodeInt64([]int64{int64(id)})
	if err != nil {
		invoker.Logger.Error("gen error", elog.FieldErr(err))
	}
	return ret
}

func ShortURLClean() {
	for {
		time.Sleep(time.Minute * 10)
		db.ShortURLDelete30Days()
	}
}
