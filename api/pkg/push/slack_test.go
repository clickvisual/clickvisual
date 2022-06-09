//Package push @Author arthur  13:56:00
package push

import (
	. "github.com/smartystreets/goconvey/convey"
	"testing"
)

func TestSlack_sendMessage(t *testing.T) {
	Convey("测试slack发送消息", t, func() {
		url := "YOUR_WEBHOOK_URL_HERE"
		title := "测试"
		text := "<https://example.com|Overlook Hotel> \\n :star: \\n Doors had too many axe holes, guest in room 237 was far too rowdy, whole place felt stuck in the 1920s."
		s := Slack{}
		err := s.sendMessage(url, title, text)
		So(err, ShouldBeNil)
	})
}
