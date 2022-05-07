package event

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func (a *event) ClusterCMDB(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	userEvent := db.Event{
		Source:     db.SourceClusterMgtCenter,
		Operation:  operation,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   string(res),
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(userEvent)
}
