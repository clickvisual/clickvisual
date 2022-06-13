package invoker

import (
	"github.com/clickvisual/prom2click"
	"github.com/ego-component/egorm"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
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

	// prom2click
	if econf.GetBool("prom2click.enable") {
		prom2click.Load("prom2click.dev").Build()
	}
	return nil
}
