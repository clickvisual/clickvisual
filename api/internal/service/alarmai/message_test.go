package alarmai

import (
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"github.com/stretchr/testify/require"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestMessageSeparatesTitleAndFormatsLegacySummary(t *testing.T) {
	job := db.AlarmAIAnalysis{
		Title: "compose 慢请求", Token: "analysis-token",
		WindowStart: time.Date(2026, 10, 16, 1, 0, 0, 0, time.UTC).Unix(),
		WindowEnd:   time.Date(2026, 10, 16, 1, 15, 0, 0, time.UTC).Unix(),
		Summary:     "结论：慢请求成立。 查询发现：1611 条慢日志。 关联证据：GetOne 约 2 秒超时。 判断与边界：未证实保存失败。 建议：检查下游连接池。",
	}
	msg := message(job, "https://cv.test/clickvisual/")
	require.Equal(t, "【AI 告警分析】compose 慢请求", msg.Title)
	require.NotContains(t, msg.Title, "1611")
	require.Contains(t, msg.Text, "**分析窗口**：2026-10-16 09:00:00 ~ 2026-10-16 09:15:00 (UTC+8)")
	require.Contains(t, msg.Text, "**结论**\n慢请求成立。\n\n**查询发现**\n1611 条慢日志。")
	require.Contains(t, msg.Text, "**判断与边界**\n未证实保存失败。")
	require.Contains(t, msg.Text, "**建议**\n检查下游连接池。")
	require.True(t, strings.HasSuffix(msg.Text, "[在 Ask 中继续排查](https://cv.test/clickvisual/v2/ask?alertAnalysis=analysis-token)"))
}

func TestMessageBoundsEachSectionWithoutDroppingAdvice(t *testing.T) {
	job := db.AlarmAIAnalysis{
		Title: strings.Repeat("慢", 200), Token: "analysis-token",
		Summary: "**结论**\n" + strings.Repeat("慢请求成立。", 250) +
			"\n\n**关键证据：**\n- GetOne 超时。\n- password=supersecret\n\n**待确认**\n未证实保存失败。\n\n**建议**\n检查数据库和连接池。",
	}
	msg := message(job, "https://cv.test")
	require.LessOrEqual(t, utf8.RuneCountInString(msg.Title), 80)
	require.LessOrEqual(t, len(msg.Text), 4000)
	require.True(t, utf8.ValidString(msg.Text))
	require.NotContains(t, msg.Text, "supersecret")
	require.Contains(t, msg.Text, "[REDACTED]")
	require.Contains(t, msg.Text, "**关键证据**\n- GetOne 超时。")
	require.Contains(t, msg.Text, "**待确认**\n未证实保存失败。")
	require.Contains(t, msg.Text, "**建议**\n检查数据库和连接池。")
	require.Contains(t, msg.Text, "/v2/ask?alertAnalysis=analysis-token)")
}

func TestMessagePlainSummaryAndTitleAreSafe(t *testing.T) {
	msg := message(db.AlarmAIAnalysis{Title: "rule\n**spoof** password=secret", Summary: "未发现足够证据。", Token: "test"}, "https://cv.test")
	require.NotContains(t, msg.Title, "\n")
	require.NotContains(t, msg.Text, "secret")
	require.Contains(t, msg.Text, "**分析摘要**\n未发现足够证据。")
	require.NotContains(t, msg.Text, "1970-")
}

func TestMessageDoesNotShortenEvidenceThatFits(t *testing.T) {
	evidence := strings.Repeat("具体证据。", 90)
	msg := message(db.AlarmAIAnalysis{Summary: "结论：已发现慢请求。\n关键证据：" + evidence + "\n待确认：影响范围未知。\n建议：检查下游。"}, "https://cv.test")
	require.Contains(t, msg.Text, evidence)
	require.NotContains(t, msg.Text, "...")
}

func TestMessagePreservesConciseNextStep(t *testing.T) {
	msg := message(db.AlarmAIAnalysis{Summary: "**结论**\neditor.js 加载失败，原因未确定。\n\n**关键证据**\n- staging 环境记录 1 次加载失败。\n\n**下一步**\n核对该资源请求的 HTTP 状态码。"}, "https://cv.test")
	require.Contains(t, msg.Text, "**关键证据**\n- staging 环境记录 1 次加载失败。\n\n**下一步**\n核对该资源请求的 HTTP 状态码。")
	require.NotContains(t, msg.Text, "**待确认**")
}

func TestRedactDoesNotDiscardLaterSections(t *testing.T) {
	text := strings.Repeat("证据。", 400) + "\n建议：检查连接池。"
	require.Contains(t, redact(text), "建议：检查连接池。")
}
