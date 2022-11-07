// Package pusher @Author arthur  15:52:00
package pusher

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	tb "gopkg.in/telebot.v3"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

type Telegram struct {
}

// TODO 偶现超时机器人的情况，暂时不使用
// Occasionally there is a situation where the robot times out, and it will not be used for the time being

func (t *Telegram) Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel, oneTheLogs string) (err error) {
	title, text, err := transformToMarkdown(notification, alarm, oneTheLogs)
	if err != nil {
		return err
	}
	err = t.sendMessage(channel.Key, title, text)
	if err != nil {
		return err
	}
	return nil
}
func (t Telegram) sendMessage(url string, title, text string) (err error) {
	tbot, err := NewTelegram(url)
	if err != nil {
		return err
	}
	id := strings.Split(url, ":")
	if len(id) < 1 {
		return errors.New("错误的telegram token")
	}
	toid, err := strconv.ParseInt(id[0], 10, 64)
	if err != nil {
		return err
	}
	err = tbot.SendMessage(title+text, toid, true)
	if err != nil {
		return err
	}
	return nil
}

type TelegramBot struct {
	bot *tb.Bot
}

func NewTelegram(token string) (*TelegramBot, error) {
	bot, err := tb.NewBot(tb.Settings{
		Token:  token,
		Poller: &tb.LongPoller{Timeout: 15 * time.Second},
	})
	if err != nil {
		return nil, err
	} else {
		return &TelegramBot{bot: bot}, nil
	}
}

func (tg *TelegramBot) SendMessage(msg string, to int64, markdown bool) error {
	opt := &tb.SendOptions{}
	if markdown {
		opt.ParseMode = tb.ModeMarkdown
		msg = fmt.Sprintf("```\n%s\n```", msg)
	}

	_, err := tg.bot.Send(tb.ChatID(to), msg, opt)
	return err
}

func (tg *TelegramBot) SendFile(filePath, fileName, mime, caption string, to int64) error {
	_, err := tg.bot.Send(tb.ChatID(to), &tb.Document{
		File:     tb.FromDisk(filePath),
		Caption:  caption,
		MIME:     mime,
		FileName: fileName,
	})
	return err
}
