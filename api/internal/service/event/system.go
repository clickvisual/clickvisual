package event

import (
	"time"

	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func (a *event) SystemMigration(u *core.User, metaData string) {
	userEvent := db.Event{
		Source:     db.SourceSystemSetting,
		Operation:  db.OpnMigration,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   metaData,
		UserName:   u.Username,
		UID:        u.Uid,
		Ctime:      time.Now().Unix(),
	}
	a.PutEvent(userEvent)
}
