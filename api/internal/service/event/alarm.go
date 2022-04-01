package event

import (
	"encoding/json"

	"github.com/shimohq/mogo/api/pkg/component/core"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

func (a *event) AlarmCMDB(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	userEvent := db.Event{
		Source:     db.SourceAlarmMgtCenter,
		Operation:  operation,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   string(res),
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(userEvent)
}
