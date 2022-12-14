package db

import (
	"strings"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/elog"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

const (
	ChannelDingDing = iota + 1
	ChannelWeChat
	ChannelFeiShu
	ChannelSlack
	ChannelEmail
	ChannelTelegram
)

const (
	FEISHUURL = "https://open.feishu.cn"
	LARKSUITE = "https://open.larksuite.com"
	SLACKURL  = "https://hooks.slack.com/services/"
)

// AlarmChannel 告警渠道
type AlarmChannel struct {
	BaseModel

	Name string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"` // 告警渠道名称
	Key  string `gorm:"column:key;type:text" json:"key"`                    // 关键信息
	Typ  int    `gorm:"column:typ;type:int(11)" json:"typ"`                 // 告警类型：0 dd
	Uid  int    `gorm:"column:uid;type:int(11)" json:"uid"`                 // 操作人
}

type ReqAlarmWebhook struct {
	Name string `json:"name" form:"name"`
	Key  string `json:"key" form:"key"`
	Typ  int    `json:"typ" form:"typ"`
	Uid  int    `json:"uid" form:"uid"`
}

type PushMsg struct {
	Title string `json:"title"`
	Text  string `json:"text"`
    Mobiles []string `json:"mobiles"`
}

func (m *AlarmChannel) TableName() string {
	return TableNameAlarmChannel
}

// JudgmentType judgment channel key legality
// temporary support slack feishu
func (m *AlarmChannel) JudgmentType() (err error) {
	switch m.Typ {
	// TODO finish all channels support
	case ChannelDingDing:
	case ChannelWeChat:
	case ChannelTelegram:
	case ChannelEmail:
	case ChannelFeiShu:
		if !(strings.HasPrefix(m.Key, LARKSUITE) || strings.HasPrefix(m.Key, FEISHUURL)) {
			err = errors.New("invalid FeiShu webhook url")
			return
		}
		// TODO Regularity constraints
	case ChannelSlack:
		if !strings.Contains(m.Key, SLACKURL) {
			err = errors.New("invalid Slack webhook url")
			return
		}
	}
	return nil
}

func AlarmChannelInfo(db *gorm.DB, id int) (resp AlarmChannel, err error) {
	var sql = "`id`= ?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmChannel{}).Where(sql, binds...).First(&resp).Error; err != nil {
		err = errors.Wrapf(err, "alarm channel id: %d", id)
		return
	}
	return
}

func AlarmChannelList(conds egorm.Conds) (resp []*AlarmChannel, err error) {
	sql, binds := egorm.BuildQuery(conds)
	if err = invoker.Db.Model(AlarmChannel{}).Where(sql, binds...).Find(&resp).Error; err != nil {
		err = errors.Wrapf(err, "conds: %v", conds)
		return
	}
	return
}

func AlarmChannelCreate(db *gorm.DB, data *AlarmChannel) (err error) {
	if err = db.Model(AlarmChannel{}).Create(data).Error; err != nil {
		elog.Error("create releaseZone error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelUpdate(db *gorm.DB, id int, ups map[string]interface{}) (err error) {
	var sql = "`id`=?"
	var binds = []interface{}{id}
	if err = db.Model(AlarmChannel{}).Where(sql, binds...).Updates(ups).Error; err != nil {
		elog.Error("release update error", zap.Error(err))
		return
	}
	return
}

func AlarmChannelDelete(db *gorm.DB, id int) (err error) {
	if err = db.Model(AlarmChannel{}).Unscoped().Delete(&AlarmChannel{}, id).Error; err != nil {
		elog.Error("release delete error", zap.Error(err))
		return
	}
	return
}
