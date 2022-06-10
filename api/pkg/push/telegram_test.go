//Package push @Author arthur  16:05:00
package push

import (
	. "github.com/smartystreets/goconvey/convey"
	"testing"
)

func TestTelegramBot_SendMessage(t *testing.T) {
	Convey("测试机器人发送消息", t, func() {
		t1, err := NewTelegram("You Token")
		text := "<https://example.com|Overlook Hotel> \\n :star: \\n Doors had too many axe holes, guest in room 237 was far too rowdy, whole place felt stuck in the 1920s."
		So(err, ShouldBeNil)
		err = t1.SendMessage(text, 5404545124, true)
		So(err, ShouldBeNil)
	})

}

func TestTelegram_sendMessage(t1 *testing.T) {
	Convey("测试机器人发送消息", t1, func() {
		tbot := Telegram{}
		title := ""
		text := "<https://example.com|Overlook Hotel> \\n :star: \\n Doors had too many axe holes, guest in room 237 was far too rowdy, whole place felt stuck in the 1920s."
		err := tbot.sendMessage("you token", title, text)

		So(err, ShouldBeNil)
	})
}
