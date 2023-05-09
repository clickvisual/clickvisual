package job

import (
	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/task/ejob"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func RunInstall(ctx ejob.Context) error {
	// if err := installCH(); err != nil {
	//	return err
	// }
	if err := installDB(); err != nil {
		return err
	}
	return nil
}

func installDB() error {
	ins := db.BaseInstance{
		Datasource:       "ch",
		Name:             "default-ch",
		Dsn:              econf.GetString("defaultCh.dsn"),
		RuleStoreType:    0,
		FilePath:         "",
		ClusterId:        0,
		Namespace:        "",
		Configmap:        "",
		PrometheusTarget: "",
	}
	err := db.InstanceCreate(invoker.Db, &ins)
	if err != nil {
		elog.Error("insert to index fail", elog.FieldErr(err))
		return err
	}
	return nil
}
