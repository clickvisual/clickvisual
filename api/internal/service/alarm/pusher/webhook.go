package pusher

import (
	"encoding/json"
	"strings"

	"github.com/go-resty/resty/v2"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/dto"
)

type Webhook struct{}

func (e *Webhook) Send(channel *db.AlarmChannel, msg *db.PushMsg) (err error) {
	b, err := json.Marshal(dto.WebhookReq{
		CalledNumberList: msg.Mobiles,
		CallContent:      msg.Title,
	})
	if err != nil {
		elog.Error("webhookSend", elog.String("title", msg.Title), elog.Any("mobiles", msg.Mobiles), elog.FieldErr(err))
		return errors.New(err.Error())
	}
	client := resty.New()
	resp, err := client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(b).
		SetResult(&dto.WebhookResp{}). // or SetResult(AuthSuccess{}).
		Post(channel.Key)
	if err != nil {
		elog.Error("webhookSend", elog.String("title", msg.Title), elog.Any("mobiles", msg.Mobiles), elog.FieldErr(err))
		return errors.New(err.Error())
	}
	if resp.StatusCode() != 200 {
		elog.Error("webhookSend", elog.String("title", msg.Title), elog.Any("mobiles", msg.Mobiles), elog.FieldErr(err))
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
	elog.Info("webhookSend", elog.String("req", string(b)), elog.String("resp", string(resp.Body())), elog.String("url", channel.Key), elog.String("title", msg.Title), elog.Any("mobiles", msg.Mobiles))
	return nil
}
