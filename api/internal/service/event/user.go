package event

import (
	"mdp/pkg/model/db"
)

func (a *event) RecordLocalUserEvent(opUser *db.User, operation string, tgtUid int, metaData string) {
	userEvent := db.Event{
		Source:     db.SourceUserMgtCenter,
		Operation:  operation,
		ObjectType: db.TableNameUser,
		ObjectId:   tgtUid,
		Metadata:   metaData,
	}
	if opUser != nil {
		userEvent.UserName = opUser.Username
		userEvent.UID = opUser.Uid
	}
	a.PutEvent(userEvent)
}
