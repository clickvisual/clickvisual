package db

const (
	TroubleshootStatusIdle           = "idle"
	TroubleshootStatusWaitingConfirm = "waiting_confirm"
)

// TroubleshootSession is one user's troubleshooting conversation.
type TroubleshootSession struct {
	BaseModel

	UID        int    `gorm:"column:uid;type:int(11);index" json:"uid"`
	Title      string `gorm:"column:title;type:varchar(64);not null;default:''" json:"title"`
	Status     string `gorm:"column:status;type:varchar(32);not null;default:'idle'" json:"status"`
	ShareToken string `gorm:"column:share_token;type:varchar(64);not null;default:'';index" json:"shareToken"`
	LastTid    int    `gorm:"column:last_tid;type:int(11);not null;default:0" json:"lastTid"`
	LastWindow int64  `gorm:"column:last_window;type:bigint;not null;default:0" json:"lastWindow"`
	Pending    string `gorm:"column:pending;type:text" json:"-"`
}

func (TroubleshootSession) TableName() string {
	return TableNameTroubleshootSession
}

// TroubleshootMessage is one turn item: user text, a tool step, or the conclusion.
type TroubleshootMessage struct {
	BaseModel

	SessionID int    `gorm:"column:session_id;type:int(11);index" json:"sessionId"`
	Role      string `gorm:"column:role;type:varchar(16);not null;default:''" json:"role"`
	Kind      string `gorm:"column:kind;type:varchar(16);not null;default:''" json:"kind"`
	Content   string `gorm:"column:content;type:text" json:"content"`
	Payload   string `gorm:"column:payload;type:text" json:"payload"`
}

func (TroubleshootMessage) TableName() string {
	return TableNameTroubleshootMessage
}
