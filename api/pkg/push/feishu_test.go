//Package push @Author arthur  11:02:00
package push

import (
	. "github.com/smartystreets/goconvey/convey"
	"testing"
)

func TestFeiShu_sendMessage(t *testing.T) {
	Convey("测试飞书传输消息", t, func() {
		url := "YOUR_WEBHOOK_URL_HERE"
		f := FeiShu{}
		err := f.sendMessage(url, "测试", "")
		So(err, ShouldBeNil)
	})
}
