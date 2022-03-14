package event

import "github.com/shimohq/mogo/api/pkg/model/db"

func (a *event) DeleteTable(opUser *db.User, metaData string) {
	userEvent := db.Event{
		Source:     db.SourceLogMgtCenter,
		Operation:  db.OpnLogTableDelete,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   metaData,
	}
	if opUser != nil {
		userEvent.UserName = opUser.Username
		userEvent.UID = opUser.ID
	}
	a.PutEvent(userEvent)
}
