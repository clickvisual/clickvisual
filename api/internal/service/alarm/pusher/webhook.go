package pusher

import (
	"strings"

	"github.com/go-resty/resty/v2"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/dto"
)

type Webhook struct{}

func (e *Webhook) Send(channel *db.AlarmChannel, msg *db.PushMsg) (err error) {
	elog.Info("webhookSend", elog.String("title", msg.Title), elog.Any("mobiles", msg.Mobiles))
	client := resty.New()
	resp, err := client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(dto.WebhookReq{
			CalledNumberList: msg.Mobiles,
			CallContent:      msg.Title + msg.Text,
		}).
		SetResult(&dto.WebhookResp{}). // or SetResult(AuthSuccess{}).
		Post(channel.Key)
	if err != nil {
		return errors.New(err.Error())
	}
	if resp.StatusCode() != 200 {
		webhookResp := resp.Result().(*dto.WebhookResp)
		failedNumber := ""
		for _, v := range webhookResp.Data {
			if v.Message == "OK" {
				continue
			}
			failedNumber += v.CalledNumber + ","
		}
		return errors.New("webhook send error, failed number: " + strings.TrimSuffix(failedNumber, ","))
	}
	return nil
}
