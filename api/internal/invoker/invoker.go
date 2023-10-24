package invoker

import (
	"github.com/ego-component/egorm"
	"github.com/ego-component/eredis"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/server/egin"

	_ "github.com/ClickHouse/clickhouse-go/v2"
	_ "github.com/databendcloud/databend-go"

	"github.com/clickvisual/clickvisual/api/internal/pkg/session"
	"github.com/clickvisual/clickvisual/api/internal/ui"
)

var (
	Db      *egorm.Component
	Gin     *egin.Component
	Session gin.HandlerFunc
	Redis   *eredis.Component
)

// Init invoker
func Init() (err error) {
	Db = egorm.Load("mysql").Build()
	Session = session.Load("auth").Build()
	Gin = egin.Load("server.http").Build(egin.WithEmbedFs(ui.WebUI))
	elog.DefaultLogger = elog.Load("logger").Build()

	if econf.GetBool("app.isMultiCopy") {
		Redis = eredis.Load("redis").Build()
	}
	return nil
}
