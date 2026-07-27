package worker

import (
	"testing"

	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func TestInitWithoutMetadataDBKeepsLooperStopped(t *testing.T) {
	econf.Reset()
	econf.Set("app.isMultiCopy", false)
	invoker.Db = nil
	CrontabRules = nil
	crontabFlag = true

	if err := Init(); err != nil {
		t.Fatalf("Init() error = %v", err)
	}
	defer func() {
		if err := Close(); err != nil {
			t.Fatalf("Close() error = %v", err)
		}
	}()

	if CrontabRules == nil {
		t.Fatal("CrontabRules is nil")
	}
	if crontabFlag {
		t.Fatal("crontabFlag = true, want false without metadata DB")
	}
}
