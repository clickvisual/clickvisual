package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/gotomicro/ego/core/elog"
)

func Run(ctx context.Context, req view.ReqAIRun) (view.AIDraftResponse, error) {
	current, err := dbmodel.AISettingInfo(invoker.Db)
	if err != nil {
		return view.AIDraftResponse{}, err
	}
	if current.ID == 0 || current.Enabled == 0 {
		return view.AIDraftResponse{}, fmt.Errorf("ai setting is disabled")
	}
	if current.MaxInputBytes > 0 && len(req.Input) > current.MaxInputBytes {
		return view.AIDraftResponse{}, fmt.Errorf("ai input exceeds maxInputBytes: %d > %d", len(req.Input), current.MaxInputBytes)
	}

	messages, err := buildScenarioMessages(req)
	if err != nil {
		return view.AIDraftResponse{}, err
	}

	content, err := CompleteText(ctx, messages, CompletionOptions{
		Temperature: req.Options.Temperature,
		MaxTokens:   req.Options.MaxTokens,
	})
	if err != nil {
		return view.AIDraftResponse{}, err
	}
	resp, err := decodeAIDraft(content)
	if err != nil {
		elog.Error(
			"ai run decode failed",
			elog.String("scenario", req.Scenario),
			elog.String("rawResponse", content),
			elog.String("error", err.Error()),
		)
		return view.AIDraftResponse{}, err
	}
	return resp, nil
}

func buildScenarioMessages(req view.ReqAIRun) ([]Message, error) {
	switch req.Scenario {
	case view.AIScenarioQueryIngestionDetectExplain:
		var input view.AIIngestionDetectExplainInput
		if err := json.Unmarshal(req.Input, &input); err != nil {
			return nil, fmt.Errorf("invalid scenario input: %w", err)
		}
		return []Message{
			{
				Role:    "system",
				Content: "你是 ClickVisual 日志接入助手。你的任务是根据日志识别结果生成结构化 AI 草案。必须只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前后缀。JSON 字段必须包含 summary, decisions, risks, suggestions, requiresUserConfirmation。risks 使用输入中的风险，不要编造不存在的识别结果。",
			},
			{
				Role:    "user",
				Content: buildDetectExplainPrompt(input),
			},
		}, nil
	case view.AIScenarioQueryIngestionFieldRecommend:
		var input view.AIIngestionFieldRecommendInput
		if err := json.Unmarshal(req.Input, &input); err != nil {
			return nil, fmt.Errorf("invalid scenario input: %w", err)
		}
		return []Message{
			{
				Role:    "system",
				Content: "你是 ClickVisual 日志字段推荐助手。请基于字段覆盖率、稳定性、是否标量、是否可加速，给出默认字段推荐草案。必须只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前后缀。JSON 字段必须包含 summary, decisions, risks, suggestions, requiresUserConfirmation。",
			},
			{
				Role:    "user",
				Content: buildFieldRecommendPrompt(input),
			},
		}, nil
	case view.AIScenarioQueryIngestionPublishSummary:
		var input view.AIIngestionPublishSummaryInput
		if err := json.Unmarshal(req.Input, &input); err != nil {
			return nil, fmt.Errorf("invalid scenario input: %w", err)
		}
		return []Message{
			{
				Role:    "system",
				Content: "你是 ClickVisual 发布摘要助手。请根据接入配置和警告生成结构化发布草案。必须只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前后缀。JSON 字段必须包含 summary, decisions, risks, suggestions, requiresUserConfirmation。risks 优先复用输入 warnings，并可在默认字段全部走 JSON 路径时提示性能观察建议。",
			},
			{
				Role:    "user",
				Content: buildPublishSummaryPrompt(input),
			},
		}, nil
	case view.AIScenarioQueryLinkAnalyze:
		var input view.AILinkAnalyzeInput
		if err := json.Unmarshal(req.Input, &input); err != nil {
			return nil, fmt.Errorf("invalid scenario input: %w", err)
		}
		return []Message{
			{
				Role:    "system",
				Content: "你是 ClickVisual 日志排查助手。请阅读同一字段值在多张日志表、同一时间窗口内的日志，给出排查结论。必须只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前后缀。JSON 字段必须包含 summary, decisions, risks, suggestions, requiresUserConfirmation。summary 给出最可能结论；decisions 用于列出关键证据日志和推理；risks 用于列出不确定性、缺失日志或时间顺序风险；suggestions 给出下一步排查动作。不要编造输入中不存在的服务、字段或错误。",
			},
			{
				Role:    "user",
				Content: buildLinkAnalyzePrompt(input),
			},
		}, nil
	default:
		return nil, fmt.Errorf("unsupported ai scenario: %s", req.Scenario)
	}
}

func decodeAIDraft(content string) (view.AIDraftResponse, error) {
	raw := extractJSONObject(content)
	normalized, err := normalizeAIDraftJSON([]byte(raw))
	if err != nil {
		return view.AIDraftResponse{}, fmt.Errorf("invalid ai draft response: %w", err)
	}
	var out view.AIDraftResponse
	if err := json.Unmarshal(normalized, &out); err != nil {
		return view.AIDraftResponse{}, fmt.Errorf("invalid ai draft response: %w", err)
	}
	if out.Decisions == nil {
		out.Decisions = make([]view.AIDecision, 0)
	}
	if out.Risks == nil {
		out.Risks = make([]view.QueryWarning, 0)
	}
	if out.Suggestions == nil {
		out.Suggestions = make([]view.AISuggestion, 0)
	}
	return out, nil
}

func normalizeAIDraftJSON(raw []byte) ([]byte, error) {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, err
	}

	decisions, err := normalizeDecisions(payload["decisions"])
	if err != nil {
		return nil, err
	}
	payload["decisions"] = decisions

	summary, err := normalizeSummary(payload["summary"])
	if err != nil {
		return nil, err
	}
	payload["summary"] = summary

	risks, err := normalizeRisks(payload["risks"])
	if err != nil {
		return nil, err
	}
	payload["risks"] = risks

	suggestions, err := normalizeSuggestions(payload["suggestions"])
	if err != nil {
		return nil, err
	}
	payload["suggestions"] = suggestions

	value, ok := payload["requiresUserConfirmation"]
	if !ok || len(value) == 0 || string(value) == "null" {
		payload["requiresUserConfirmation"] = []byte("true")
	} else {
		trimmed := strings.TrimSpace(string(value))
		switch {
		case trimmed == "true" || trimmed == "false":
		case strings.HasPrefix(trimmed, "["):
			var arr []interface{}
			if err := json.Unmarshal(value, &arr); err != nil || len(arr) == 0 {
				payload["requiresUserConfirmation"] = []byte("true")
				break
			}
			if boolVal, ok := arr[0].(bool); ok {
				if boolVal {
					payload["requiresUserConfirmation"] = []byte("true")
				} else {
					payload["requiresUserConfirmation"] = []byte("false")
				}
				break
			}
			payload["requiresUserConfirmation"] = []byte("true")
		default:
			payload["requiresUserConfirmation"] = []byte("true")
		}
	}

	return json.Marshal(payload)
}

func normalizeSummary(value json.RawMessage) ([]byte, error) {
	if len(value) == 0 || string(value) == "null" {
		return []byte(`""`), nil
	}
	trimmed := strings.TrimSpace(string(value))
	if strings.HasPrefix(trimmed, `"`) {
		return value, nil
	}

	var object map[string]interface{}
	if err := json.Unmarshal(value, &object); err != nil {
		return []byte(strconv.Quote(trimmed)), nil
	}

	parts := make([]string, 0, 4)
	if basis := formatAIValue(object["basis"]); basis != "" {
		parts = append(parts, basis)
	}
	if recommended := formatAIValue(object["recommendedDefaultFields"]); recommended != "" {
		parts = append(parts, "推荐默认字段："+recommended)
	}
	if numeric := formatAIValue(object["candidateNumericFields"]); numeric != "" {
		parts = append(parts, "候选数值字段："+numeric)
	}
	if excluded := formatAIValue(object["excludedFromDefault"]); excluded != "" {
		parts = append(parts, "不建议默认字段："+excluded)
	}
	return []byte(strconv.Quote(strings.Join(parts, "；"))), nil
}

func normalizeDecisions(value json.RawMessage) ([]byte, error) {
	if len(value) == 0 || string(value) == "null" {
		return []byte("[]"), nil
	}
	trimmed := strings.TrimSpace(string(value))
	if strings.HasPrefix(trimmed, "[") {
		return normalizeDecisionArray(value)
	}

	var single view.AIDecision
	if err := json.Unmarshal(value, &single); err == nil {
		if single.Key != "" || single.Title != "" || single.Description != "" {
			return []byte("[" + trimmed + "]"), nil
		}
	}

	var object map[string]json.RawMessage
	if err := json.Unmarshal(value, &object); err != nil {
		return []byte("[" + trimmed + "]"), nil
	}
	out := make([]view.AIDecision, 0, len(object))
	for key, raw := range object {
		var item struct {
			Recommended  interface{} `json:"recommended"`
			Alternatives []string    `json:"alternatives"`
			Reason       string      `json:"reason"`
			TargetField  string      `json:"targetField"`
			Expected     []string    `json:"expectedExtractedFields"`
		}
		if err := json.Unmarshal(raw, &item); err != nil {
			out = append(out, view.AIDecision{
				Key:         key,
				Title:       key,
				Description: strings.TrimSpace(string(raw)),
			})
			continue
		}
		descriptionParts := make([]string, 0, 4)
		if item.Recommended != nil {
			descriptionParts = append(descriptionParts, "推荐值："+formatAIValue(item.Recommended))
		}
		if len(item.Alternatives) > 0 {
			descriptionParts = append(descriptionParts, "备选："+strings.Join(item.Alternatives, "、"))
		}
		if item.TargetField != "" {
			descriptionParts = append(descriptionParts, "目标字段："+item.TargetField)
		}
		if len(item.Expected) > 0 {
			descriptionParts = append(descriptionParts, "预期提取字段："+strings.Join(item.Expected, "、"))
		}
		if item.Reason != "" {
			descriptionParts = append(descriptionParts, item.Reason)
		}
		out = append(out, view.AIDecision{
			Key:         key,
			Title:       key,
			Description: strings.Join(descriptionParts, "；"),
		})
	}
	return json.Marshal(out)
}

func normalizeSuggestions(value json.RawMessage) ([]byte, error) {
	if len(value) == 0 || string(value) == "null" {
		return []byte("[]"), nil
	}
	trimmed := strings.TrimSpace(string(value))
	if !strings.HasPrefix(trimmed, "[") {
		return []byte("[" + trimmed + "]"), nil
	}

	var items []interface{}
	if err := json.Unmarshal(value, &items); err != nil {
		return value, nil
	}
	out := make([]view.AISuggestion, 0, len(items))
	for index, item := range items {
		switch typed := item.(type) {
		case string:
			out = append(out, view.AISuggestion{
				Type:        "suggestion",
				Title:       fmt.Sprintf("建议 %d", index+1),
				Description: typed,
			})
		case map[string]interface{}:
			payload := typed
			if fieldKeys := collectSuggestionFieldKeys(typed); len(fieldKeys) > 0 {
				payload = cloneSuggestionPayload(typed)
				payload["fieldKeys"] = fieldKeys
			}
			desc := formatAIValue(typed["description"])
			if desc == "" {
				desc = formatAIValue(typed["detail"])
			}
			if desc == "" {
				desc = formatAIValue(typed["action"])
			}
			if desc == "" {
				desc = formatAIValue(typed["fields"])
			}
			if desc == "" {
				desc = formatAIValue(typed)
			}
			out = append(out, view.AISuggestion{
				Type:        defaultString(formatAIValue(typed["type"]), "suggestion"),
				Title:       defaultString(formatAIValue(typed["title"]), fmt.Sprintf("建议 %d", index+1)),
				Description: desc,
				Payload:     payload,
			})
		default:
			out = append(out, view.AISuggestion{
				Type:        "suggestion",
				Title:       fmt.Sprintf("建议 %d", index+1),
				Description: formatAIValue(typed),
			})
		}
	}
	return json.Marshal(out)
}

func collectSuggestionFieldKeys(value map[string]interface{}) []string {
	fields := make([]string, 0)
	appendField := func(raw interface{}) {
		name := strings.TrimSpace(formatAIValue(raw))
		if name != "" {
			fields = append(fields, name)
		}
	}

	switch typed := value["fields"].(type) {
	case []interface{}:
		for _, item := range typed {
			appendField(item)
		}
	case []string:
		for _, item := range typed {
			appendField(item)
		}
	}

	if fieldKey := value["fieldKey"]; fieldKey != nil {
		appendField(fieldKey)
	}

	if len(fields) == 0 {
		return nil
	}
	uniq := make([]string, 0, len(fields))
	seen := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		if _, ok := seen[field]; ok {
			continue
		}
		seen[field] = struct{}{}
		uniq = append(uniq, field)
	}
	return uniq
}

func cloneSuggestionPayload(value map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(value))
	for key, item := range value {
		out[key] = item
	}
	return out
}

func normalizeRisks(value json.RawMessage) ([]byte, error) {
	if len(value) == 0 || string(value) == "null" {
		return []byte("[]"), nil
	}
	trimmed := strings.TrimSpace(string(value))
	if !strings.HasPrefix(trimmed, "[") {
		return []byte("[" + trimmed + "]"), nil
	}

	var items []interface{}
	if err := json.Unmarshal(value, &items); err != nil {
		return value, nil
	}
	out := make([]view.QueryWarning, 0, len(items))
	for index, item := range items {
		switch typed := item.(type) {
		case string:
			out = append(out, view.QueryWarning{
				Code:    fmt.Sprintf("ai_risk_%d", index+1),
				Level:   "warning",
				Message: typed,
			})
		case map[string]interface{}:
			message := formatAIValue(typed["message"])
			if message == "" {
				message = formatAIValue(typed["detail"])
			}
			message = defaultString(message, formatAIValue(typed))
			out = append(out, view.QueryWarning{
				Code:    defaultString(formatAIValue(typed["code"]), defaultString(formatAIValue(typed["type"]), fmt.Sprintf("ai_risk_%d", index+1))),
				Level:   defaultString(formatAIValue(typed["level"]), "warning"),
				Message: message,
			})
		default:
			out = append(out, view.QueryWarning{
				Code:    fmt.Sprintf("ai_risk_%d", index+1),
				Level:   "warning",
				Message: formatAIValue(typed),
			})
		}
	}
	return json.Marshal(out)
}

func normalizeDecisionArray(value json.RawMessage) ([]byte, error) {
	var items []interface{}
	if err := json.Unmarshal(value, &items); err != nil {
		return value, nil
	}
	out := make([]view.AIDecision, 0, len(items))
	for index, item := range items {
		switch typed := item.(type) {
		case map[string]interface{}:
			key := defaultString(formatAIValue(typed["key"]), formatAIValue(typed["fieldKey"]))
			title := defaultString(
				formatAIValue(typed["title"]),
				defaultString(formatAIValue(typed["fieldKey"]), fmt.Sprintf("建议 %d", index+1)),
			)
			descriptionParts := make([]string, 0, 6)
			if action := formatAIValue(typed["action"]); action != "" {
				descriptionParts = append(descriptionParts, "动作："+action)
			}
			if priority := formatAIValue(typed["priority"]); priority != "" {
				descriptionParts = append(descriptionParts, "优先级："+priority)
			}
			if recommended := formatAIValue(typed["recommended"]); recommended != "" {
				descriptionParts = append(descriptionParts, "推荐值："+recommended)
			}
			if reasons := formatAIValue(typed["reasons"]); reasons != "" {
				descriptionParts = append(descriptionParts, "理由："+reasons)
			}
			if reason := formatAIValue(typed["reason"]); reason != "" {
				descriptionParts = append(descriptionParts, reason)
			}
			if caveat := formatAIValue(typed["caveat"]); caveat != "" {
				descriptionParts = append(descriptionParts, "注意："+caveat)
			}
			if alternatives := formatAIValue(typed["alternatives"]); alternatives != "" {
				descriptionParts = append(descriptionParts, "备选："+alternatives)
			}
			if targetField := formatAIValue(typed["targetField"]); targetField != "" {
				descriptionParts = append(descriptionParts, "目标字段："+targetField)
			}
			if expected := formatAIValue(typed["expectedExtractedFields"]); expected != "" {
				descriptionParts = append(descriptionParts, "预期提取字段："+expected)
			}
			description := strings.Join(descriptionParts, "；")
			if description == "" {
				description = formatAIValue(typed)
			}
			out = append(out, view.AIDecision{
				Key:         defaultString(key, fmt.Sprintf("decision_%d", index+1)),
				Title:       title,
				Description: description,
			})
		default:
			text := formatAIValue(typed)
			out = append(out, view.AIDecision{
				Key:         fmt.Sprintf("decision_%d", index+1),
				Title:       fmt.Sprintf("建议 %d", index+1),
				Description: text,
			})
		}
	}
	return json.Marshal(out)
}

func formatAIValue(value interface{}) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case bool:
		if typed {
			return "true"
		}
		return "false"
	case float64:
		return strings.TrimSuffix(strings.TrimSuffix(fmt.Sprintf("%.6f", typed), "0"), ".")
	case []interface{}:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			part := formatAIValue(item)
			if part != "" {
				parts = append(parts, part)
			}
		}
		return strings.Join(parts, "、")
	default:
		raw, _ := json.Marshal(typed)
		return string(raw)
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func extractJSONObject(content string) string {
	trimmed := strings.TrimSpace(content)
	if strings.HasPrefix(trimmed, "```") {
		trimmed = strings.TrimPrefix(trimmed, "```json")
		trimmed = strings.TrimPrefix(trimmed, "```")
		trimmed = strings.TrimSuffix(trimmed, "```")
		trimmed = strings.TrimSpace(trimmed)
	}
	start := strings.Index(trimmed, "{")
	end := strings.LastIndex(trimmed, "}")
	if start >= 0 && end >= start {
		return trimmed[start : end+1]
	}
	return trimmed
}

func buildDetectExplainPrompt(input view.AIIngestionDetectExplainInput) string {
	data, _ := json.Marshal(input)
	return "请根据以下识别结果生成接入解析建议草案，强调时间字段、正文字段、标签字段、二次 JSON 判断，并给出需要人工确认的风险。\n输入 JSON：\n" + string(data)
}

func buildFieldRecommendPrompt(input view.AIIngestionFieldRecommendInput) string {
	data, _ := json.Marshal(input)
	return "请根据以下字段目录推荐默认字段。优先考虑高覆盖、高稳定、标量字段和可直接过滤字段，避免推荐不稳定或非标量字段。\n输入 JSON：\n" + string(data)
}

func buildPublishSummaryPrompt(input view.AIIngestionPublishSummaryInput) string {
	data, _ := json.Marshal(input)
	return "请根据以下发布上下文生成发布摘要草案，明确事件时间、默认字段、发布策略和风险提示。\n输入 JSON：\n" + string(data)
}

func buildLinkAnalyzePrompt(input view.AILinkAnalyzeInput) string {
	data, _ := json.Marshal(input)
	return "请分析以下链路日志。按时间顺序识别异常点、最可能根因、影响范围、证据日志和下一步排查动作。若证据不足，请明确说明不足，不要给确定性结论。\n输入 JSON：\n" + string(data)
}
