package event

import (
	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

func (a *event) UsersPwdChange(opUser *core.User, metaData string) {
	obj := db.Event{
		Source:     db.SourceUserMgtCenter,
		Operation:  db.OpnLocalUsersPwdChange,
		ObjectType: db.TableNameUser,
		ObjectId:   0,
		Metadata:   metaData,
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(obj)
}
