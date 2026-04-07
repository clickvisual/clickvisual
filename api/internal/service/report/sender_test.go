package report

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormatDingTalkMarkdownText(t *testing.T) {
	raw := "### 查询结果\n\n• pod 报错统计\n  ∘ 总量\n    当前：14629\n    昨日：16013\n    环比：🟢 -8.64%"

	formatted := formatDingTalkMarkdownText(raw)

	assert.Equal(t, "### 查询结果\n\n• pod 报错统计\n\n  ∘ 总量\n\n    当前：14629\n\n    昨日：16013\n\n    环比：🟢 -8.64%", formatted)
}
