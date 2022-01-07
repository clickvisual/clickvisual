package invoker

import (
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego-component/eredis"
	"github.com/gotomicro/ego-component/esession"
	"github.com/gotomicro/ego/server/egin"
	"github.com/shimohq/mogo/api/internal/ui"
)

var (
	Gin     *egin.Component
	Db      *egorm.Component
	Session gin.HandlerFunc
	Redis   *eredis.Component
)

// Init invoker
func Init() (err error) {
	Session = esession.Load("session").Build()
	Gin = egin.Load("server.http").Build(egin.WithEmbedFs(ui.WebUI))
	Db = egorm.Load("mysql.default").Build()
	Redis = eredis.Load("redis.default").Build()
	return nil
}
