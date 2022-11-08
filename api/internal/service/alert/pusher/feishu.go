package pusher

import (
	"errors"

	"github.com/clickvisual/clickvisual/api/internal/service/alert/pusher/feishu"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

var _ IPusher = (*FeiShu)(nil)

type FeiShu struct{}

func (s *FeiShu) Send(notification db.Notification, table *db.BaseTable, alarm *db.Alarm, filter *db.AlarmFilter,
	channel *db.AlarmChannel, oneTheLogs string) (err error) {
	title, text, err := constructMessage(notification, table, alarm, filter, oneTheLogs)
	if err != nil {
		return err
	}
	err = s.sendMessage(channel.Key, title, text)
	if err != nil {
		return err
	}
	return nil
}

// sendMessage
//
//	Description: 发送消息至feishu
//	receiver s
//	 param url webhook 地址
//	 param title 标题
//	 param text md 内容
//	return err 错误
func (s *FeiShu) sendMessage(url string, title, text string) (err error) {
	msg := feishu.NewCardMsg(title, feishu.WARNING)
	msg.AddElement(text)
	sendMsg, errflag, err := feishu.SendMsg(url, msg)
	// err 不为空基本为本地问题
	// err is not empty is basically a local problem
	if err != nil {
		return
	}
	// errflag 为true 基本为远端报错
	// If the error flag is true, it is basically a remote error
	if errflag {
		err = errors.New(sendMsg.(string))
		return
	}
	return
}
