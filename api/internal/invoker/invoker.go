package invoker

import (
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego-component/egorm"
	"github.com/gotomicro/ego-component/esession"
	"github.com/gotomicro/ego/server/egin"
)

var (
	Gin     *egin.Component
	Db      *egorm.Component
	Session gin.HandlerFunc
)

// Init invoker
func Init() (err error) {
	Session = esession.Load("session").Build()
	Gin = egin.Load("server.http").Build()
	Db = egorm.Load("mysql.default").Build()
	return nil
}
