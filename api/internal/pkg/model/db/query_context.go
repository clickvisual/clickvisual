package db

import (
	"context"
	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/queryguard"
	"gorm.io/gorm"
)

// QueryMetadata identifies the actual metadata pool before any database wait.
func QueryMetadata(ctx context.Context) *gorm.DB {
	pool, _ := invoker.Db.DB()
	queryguard.Stage(ctx, "metadata", pool)
	return invoker.Db.WithContext(ctx)
}
