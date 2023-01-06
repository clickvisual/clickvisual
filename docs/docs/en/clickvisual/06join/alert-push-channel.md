# 新增告警推送途径

## 后端开发
开发目录 `/api/pkg/push`

例如实现微信推送，实现 Send 函数功能
```
type WeChat struct{}

func (d *WeChat) Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel) (err error) {
	// TODO: implement
	return errors.New("functionality is not yet implemented")
}
```

增加 Channel
```
const (
	ChannelDingDing int = 1
	ChannelWeChat   int = 2
)

type Operator interface {
	Send(notification view.Notification, alarm *db.Alarm, channel *db.AlarmChannel) (err error)
}

func Instance(typ int) (Operator, error) {
	var err error
	switch typ {
	case ChannelDingDing:
		return &DingDing{}, nil
	case ChannelWeChat:
		return &WeChat{}, nil
	default:
		err = errors.New("undefined channels")
	}
	return nil, err
}
```

## 前端开发
开发目录`/ui/src/pages/Alarm/hooks`

增加 ChannelTypes 内容即可，注意前端国际化，国际化文件位置在`/ui/src/locales`

```js
  const ChannelTypes = [
    { name: i18n.formatMessage({ id: "dingTalk" }), value: 1 },
  ];
```


