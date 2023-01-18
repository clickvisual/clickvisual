// Package feishu @Author arthur  09:51:00
package feishu

const (
	WARNING = "red"
	PASS    = "green"
)

type CardMsg struct {
	*Sign
	MsgType string `json:"msg_type,omitempty"`
	Card    Card   `json:"card,omitempty"`
}

type Card struct {
	Config   Config    `json:"config,omitempty"`
	Elements []Element `json:"elements,omitempty"`
	Header   Header    `json:"header,omitempty"`
}

type Element struct {
	Tag   string `json:"tag,omitempty"`
	*Body `json:"text"`
	*Actions
}

type Config struct {
	WideScreenMode bool `json:"wide_screen_mode,omitempty"`
	EnableForward  bool `json:"enable_forward,omitempty"`
}
type Actions struct {
	Actions []ActionsItem `json:"actions"`
}
type ActionsItem struct {
	Tag  string `json:"tag"`
	Text struct {
		Content string `json:"content"`
		Tag     string `json:"tag"`
	} `json:"text"`
	URL   string `json:"url"`
	Type  string `json:"type"`
	Value struct {
	} `json:"value"`
}
type Header struct {
	Title    Body   `json:"title,omitempty"`
	Template string `json:"template"`
}

type Body struct {
	Content string `json:"content,omitempty"`
	Tag     string `json:"tag,omitempty"`
}

func NewCardMsg(title, template string) *CardMsg {
	return &CardMsg{
		MsgType: "interactive",
		Card: Card{
			Config: Config{
				WideScreenMode: true,
				EnableForward:  true,
			},
			Header: Header{
				Title: Body{
					Tag:     "plain_text",
					Content: title,
				},
				Template: template,
			},
		},
	}
}

func NewCardMsgWithSign(secret, template, title string) *CardMsg {
	sign := NewSign(secret)
	return &CardMsg{
		Sign:    sign,
		MsgType: "interactive",
		Card: Card{
			Config: Config{
				WideScreenMode: true,
				EnableForward:  true,
			},
			Header: Header{
				Title: Body{
					Tag:     "plain_text",
					Content: title,
				},
				Template: template,
			},
		},
	}
}

// AddElement 添加一个内容，内容的格式为markdown形式
// Add a content in markdown format
func (c *CardMsg) AddElement(content string) {
	element := Element{
		Tag: "div",
		Body: &Body{Content: content,
			Tag: "lark_md"},
	}
	c.Card.Elements = append(c.Card.Elements, element)

}

// AddUrl 增加一个url的内容
// Add the content of  url
func (c *CardMsg) AddUrl(url string) {

	element := Element{
		Tag: "action",
		Actions: &Actions{
			Actions: []ActionsItem{{
				Tag: "button",
				Text: struct {
					Content string `json:"content"`
					Tag     string `json:"tag"`
				}{
					Content: "**提交结束，注意检查链接**😊",
					Tag:     "lark_md",
				},
				URL:   url,
				Type:  "primary",
				Value: struct{}{},
			}},
		},
	}
	c.Card.Elements = append(c.Card.Elements, element)

}

// AddAtAll 增加一个@全体的功能
// Add an @All function
func (c *CardMsg) AddAtAll() {
	element := Element{
		Tag: "div",
		Body: &Body{
			Content: "<at id=all></at> \n",
			Tag:     "lark_md",
		},
	}
	c.Card.Elements = append(c.Card.Elements, element)
}
