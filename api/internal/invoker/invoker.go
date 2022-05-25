package invoker

import (
	"github.com/ego-component/egorm"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egin"

	"github.com/clickvisual/clickvisual/api/internal/ui"
	"github.com/clickvisual/clickvisual/api/pkg/session"
)

var (
	Db      *egorm.Component
	Gin     *egin.Component
	Logger  *elog.Component
	Session gin.HandlerFunc
)

// Init invoker
func Init() (err error) {
	Db = egorm.Load("mysql").Build()
	Logger = elog.Load("logger").Build()
	Session = session.Load("auth").Build()
	Gin = egin.Load("server.http").Build(egin.WithEmbedFs(ui.WebUI))
	return nil
}
