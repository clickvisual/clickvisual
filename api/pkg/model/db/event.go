package db

type Event struct {
	ID            int    `gorm:"primary_key,not null;AUTO_INCREMENT" json:"id"`
	Source        string `gorm:"not null;default:'';size:64;index:idx_source;comment:事件来源" json:"source"`
	UserName      string `gorm:"not null;default:'';size:32;comment:操作用户的名字" json:"userName"`
	UID           int    `gorm:"not null;default:0;comment:操作用户的uid" json:"uid"`
	Operation     string `gorm:"not null;default:'';size:64;index:idx_operation;comment:操作名" json:"operation"`
	ObjectType    string `gorm:"not null;default:'';size:64;comment:被操作对象的类型(一般为db.Table名)" json:"objectType"`
	ObjectId      int    `gorm:"not null;default:0;comment:被操作对象类型(db.Table)下的具体对象的主键(id)" json:"ObjectId"`
	Metadata      string `gorm:"not null;type:text;comment:事件内容" json:"metadata"`
	Ctime         int64  `gorm:"not null;default:0;type:bigint;autoCreateTime;comment:事件发生时间" json:"ctime"`
	OperationName string `gorm:"-" json:"operationName"`
	SourceName    string `gorm:"-" json:"sourceName"`
}

func (Event) TableName() string {
	return TableMogoEvent
}

func (a *Event) HandleOperationName() {
	a.OperationName = OperationMap[a.Operation]
}

func (a *Event) HandleSourceName() {
	a.SourceName = SourceMap[a.Source]
}
