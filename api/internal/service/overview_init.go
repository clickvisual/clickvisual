package service

import (
	"fmt"

	"github.com/ego-component/egorm"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service/overview"
)

// initOverview wires instance permission and ClickHouse system.tables access
// into the overview package, which must not import service directly.
func initOverview() {
	overview.PermittedInstanceIDs = func(uid int) ([]int, error) {
		instances, err := db.InstanceList(egorm.Conds{})
		if err != nil {
			return nil, err
		}
		ids := make([]int, 0, len(instances))
		for _, instance := range instances {
			if InstanceViewIsPermission(uid, instance.ID) {
				ids = append(ids, instance.ID)
			}
		}
		return ids, nil
	}
	overview.ListSystemTables = func(iid int) ([]*view.SystemTables, error) {
		op, err := InstanceManager.Load(iid)
		if err != nil {
			return nil, err
		}
		rows := op.ListSystemTable()
		if len(rows) == 0 {
			return nil, fmt.Errorf("system.tables returned no rows")
		}
		return rows, nil
	}
}
