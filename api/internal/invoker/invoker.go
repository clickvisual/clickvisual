package invoker

import (
	"github.com/ego-component/egorm"
	"github.com/ego-component/eredis"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egin"
	"github.com/speps/go-hashids/v2"

	"github.com/clickvisual/clickvisual/api/internal/ui"
	"github.com/clickvisual/clickvisual/api/pkg/session"
)

var (
	Db      *egorm.Component
	Gin     *egin.Component
	Logger  *elog.Component
	Session gin.HandlerFunc
	Redis   *eredis.Component

	HashId *hashids.HashID
)

const Alphabet = "023456789abcdefghjkmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ"

// Init invoker
func Init() (err error) {
	Db = egorm.Load("mysql").Build()
	Logger = elog.Load("logger").Build()
	Session = session.Load("auth").Build()
	Gin = egin.Load("server.http").Build(egin.WithEmbedFs(ui.WebUI))

	if econf.GetBool("app.isMultiCopy") {
		Redis = eredis.Load("redis").Build()
	}
	// new hash
	HashId = newHashID()
	return nil
}

func newHashID() *hashids.HashID {
	hd := hashids.NewData()
	hd.MinLength = 6
	hd.Salt = "BFE2D372AAFCE4001D41351A4F32D7DE"
	hd.Alphabet = "023456789abcdefghjkmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ"
	h, err := hashids.NewWithData(hd)
	if err != nil {
		panic("hashids init error: " + err.Error())
	}
	return h
}
