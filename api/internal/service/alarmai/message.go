package alarmai

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

var summaryHeading = regexp.MustCompile(`(?m)(?:^|\s)(?:#{1,6}[ \t]+)?(?:\*\*)?(结论|关键证据|查询发现|关联证据|判断与边界|待确认|建议|证据范围)(?:\*\*)?(?:[：:](?:\*\*)?[ \t]*|\r?\n)`)

func message(job db.AlarmAIAnalysis, root string) *db.PushMsg {
	name := limitMessageText(strings.Join(strings.Fields(redact(job.Title)), " "), 160)
	title := "【AI 告警分析】"
	if name != "" {
		title += name
	}
	escape := strings.NewReplacer("\\", "\\\\", "*", "\\*", "_", "\\_", "[", "\\[", "]", "\\]", "`", "\\`", "<", "&lt;", ">", "&gt;")
	text := "**" + escape.Replace(title) + "**\n\n"
	if job.WindowStart > 0 && job.WindowEnd > job.WindowStart {
		zone := time.FixedZone("UTC+8", 8*60*60)
		text += fmt.Sprintf("**分析窗口**：%s ~ %s (UTC+8)\n\n", time.Unix(job.WindowStart, 0).In(zone).Format(time.DateTime), time.Unix(job.WindowEnd, 0).In(zone).Format(time.DateTime))
	}
	link := strings.TrimRight(root, "/") + "/v2/ask?" + url.Values{"alertAnalysis": {job.Token}}.Encode()
	footer := "\n\n[在 Ask 中继续排查](" + link + ")"
	// Reserve space for metadata and the continuation link, including on WeChat (4096 bytes).
	text += formatSummary(redact(job.Summary), min(2800, max(0, 4000-len(text)-len(footer))))
	return &db.PushMsg{Title: title, Text: text + footer}
}

func formatSummary(summary string, budget int) string {
	type section struct{ heading, body string }
	sections := []section{}
	matches := summaryHeading.FindAllStringSubmatchIndex(summary, 12)
	for i, match := range matches {
		if i == 0 && strings.TrimSpace(summary[:match[0]]) != "" {
			sections = append(sections, section{"分析摘要", strings.TrimSpace(summary[:match[0]])})
		}
		end := len(summary)
		if i+1 < len(matches) {
			end = matches[i+1][0]
		}
		sections = append(sections, section{summary[match[2]:match[3]], strings.TrimSpace(summary[match[1]:end])})
	}
	if len(matches) == 0 {
		sections = append(sections, section{"分析摘要", strings.TrimSpace(summary)})
	}
	for _, section := range sections {
		budget -= len(section.heading) + len("****\n\n\n")
	}
	// Bound sections individually so lengthy evidence cannot displace caveats and advice.
	perSection := max(0, budget/len(sections))
	limits := make([]int, len(sections))
	remaining := max(0, budget)
	for i, section := range sections {
		limits[i] = min(len(section.body), perSection)
		remaining -= limits[i]
	}
	for i, section := range sections {
		extra := min(remaining, len(section.body)-limits[i])
		limits[i] += extra
		remaining -= extra
	}
	parts := make([]string, 0, len(sections))
	for i, section := range sections {
		parts = append(parts, "**"+section.heading+"**\n"+limitMessageText(section.body, limits[i]))
	}
	return strings.Join(parts, "\n\n")
}

func limitMessageText(text string, budget int) string {
	if len(text) <= budget {
		return text
	}
	if budget < 3 {
		return ""
	}
	end, sentence := 0, 0
	for i, r := range text {
		if i > budget-3 {
			break
		}
		end = i
		if i > budget/2 && strings.ContainsRune("\n。！？；", r) {
			sentence = i
		}
	}
	if sentence > 0 {
		end = sentence
	}
	return strings.TrimSpace(text[:end]) + "..."
}
