package event

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

func (a *event) InquiryCMDB(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	userEvent := db.Event{
		Source:     db.SourceInquiryMgtCenter,
		Operation:  operation,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   string(res),
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(userEvent)
}
