package event

import (
	"encoding/json"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	db2 "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func (a *event) AlarmCMDB(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	userEvent := db2.Event{
		Source:     db2.SourceAlarmMgtCenter,
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
	userEvent := db2.Event{
		Source:     db2.SourceBigDataMgtCenter,
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
	userEvent := db2.Event{
		Source:     db2.SourceClusterMgtCenter,
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
	userEvent := db2.Event{
		Source:     db2.SourceConfigMgtCenter,
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
	userEvent := db2.Event{
		Source:     db2.SourceInquiryMgtCenter,
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
	userEvent := db2.Event{
		Source:     db2.SourceSystemSetting,
		Operation:  db2.OpnMigration,
		ObjectType: "",
		ObjectId:   0,
		Metadata:   metaData,
		UserName:   u.Username,
		UID:        u.Uid,
	}
	a.PutEvent(userEvent)
}

func (a *event) UserCMDB(opUser *core.User, operation string, metaData map[string]interface{}) {
	res, _ := json.Marshal(metaData)
	obj := db2.Event{
		Source:     db2.SourceUserMgtCenter,
		Operation:  operation,
		ObjectType: db2.TableNameUser,
		ObjectId:   0,
		Metadata:   string(res),
		UserName:   opUser.Username,
		UID:        opUser.Uid,
	}
	a.PutEvent(obj)
}
