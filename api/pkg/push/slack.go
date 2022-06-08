package push

import (
	"bytes"
	"fmt"
	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
	"log"
	"net/http"
)

type Slack struct{}

func (s *Slack) Send(notification view.Notification, alarm *db.Alarm,
	channel *db.AlarmChannel, oneTheLogs string) (err error) {
	title, text, err := transformToMarkdown(notification, alarm, channel, oneTheLogs)
	if err != nil {
		return err
	}
	s.sendMessage(channel.Key, title, text)
	return nil
}
func (s *Slack) sendMessage(url string, title, text string) {
	param := "payload={\"text\": \"ハゲハゲ\"}"
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(param))
	if err != nil {
		log.Fatal(err)
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(res)
}
