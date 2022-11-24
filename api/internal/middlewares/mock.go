package middlewares

import (
	"github.com/gin-gonic/gin"

	"github.com/clickvisual/clickvisual/api/pkg/component/core"
)

func SetMockUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctxUser := &core.User{Uid: int64(1), Nickname: "clickvisual", Username: "clickvisual"}
		c.Set(core.UserContextKey, ctxUser)
		c.Next()
		return
	}
}
