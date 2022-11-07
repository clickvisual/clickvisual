// Package pusher @Author arthur  11:02:00
package pusher

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
)

func TestFeiShu_sendMessage(t *testing.T) {
	Convey("测试飞书传输消息", t, func() {
		url := "YOUR_WEBHOOK_URL_HERE"
		f := FeiShu{}
		err := f.sendMessage(url, "测试", "")
		So(err, ShouldBeNil)
	})
}
