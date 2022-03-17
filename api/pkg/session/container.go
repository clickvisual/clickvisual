package session

import (
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/memstore"
	"github.com/gin-contrib/sessions/redis"
	"github.com/gin-gonic/gin"
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
)

type Option func(c *Container)

type Container struct {
	config *config
	name   string
	logger *elog.Component
}

func DefaultContainer() *Container {
	return &Container{
		config: DefaultConfig(),
		logger: elog.EgoLogger.With(elog.FieldComponent("component.esession")),
	}
}

func Load(key string) *Container {
	c := DefaultContainer()
	if err := econf.UnmarshalKey(key, &c.config); err != nil {
		c.logger.Panic("parse config error", elog.FieldErr(err), elog.FieldKey(key))
		return c
	}
	c.name = key
	c.logger = c.logger.With(elog.FieldComponentName(key))
	return c
}

// Build 构建mpms.Config实例
func (c *Container) Build(options ...Option) gin.HandlerFunc {
	for _, option := range options {
		option(c)
	}

	var store sessions.Store
	var err error
	switch c.config.Mode {
	case "redis":
		store, err = redis.NewStore(c.config.RedisSize, c.config.RedisNetwork, c.config.RedisAddr, c.config.RedisPassword, []byte(c.config.Keypairs))
		if err != nil {
			c.logger.Panic("config new store panic", elog.FieldErr(err))
		}
	case "memstore":
		store = memstore.NewStore([]byte(c.config.Keypairs))
	}
	return sessions.Sessions(c.config.Name, store)
}
