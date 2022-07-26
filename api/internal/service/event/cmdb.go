package event

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/pkg/component/core"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
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

func (a *event) Pandas(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	userEvent := db.Event{
		Source:     db.SourceBigDataMgtCenter,
		Operation:  operation,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   string(res),
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(userEvent)
}

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

func (a *event) ConfigCMDB(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	userEvent := db.Event{
		Source:     db.SourceConfigMgtCenter,
		Operation:  operation,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   string(res),
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(userEvent)
}

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

func (a *event) SystemMigration(u *core.User, metaData string) {
	userEvent := db.Event{
		Source:     db.SourceSystemSetting,
		Operation:  db.OpnMigration,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   metaData,
		UserName:   u.Username,
		UID:        u.Uid,
	}
	a.PutEvent(userEvent)
}

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
