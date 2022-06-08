package push

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type FeiShu struct{}

func (s *FeiShu) Send(notification view.Notification, alarm *db.Alarm,
	channel *db.AlarmChannel, oneTheLogs string) (err error) {
	title, text, err := transformToMarkdown(notification, alarm, channel, oneTheLogs)
	if err != nil {
		return err
	}
	s.sendMessage("", title, text)
	return nil
}

func (s FeiShu) sendMessage(url string, title, text string) {

}
