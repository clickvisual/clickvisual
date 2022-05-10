package db

type Event struct {
	ID            int    `gorm:"primary_key,not null;AUTO_INCREMENT" json:"id"`
	Source        string `gorm:"not null;default:'';size:64;index:idx_source;comment:事件来源" json:"source"`
	UserName      string `gorm:"not null;default:'';size:32;comment:操作用户的名字" json:"userName"`
	UID           int64  `gorm:"not null;default:0;comment:操作用户的uid" json:"uid"`
	Operation     string `gorm:"not null;default:'';size:64;index:idx_operation;comment:操作名" json:"operation"`
	ObjectType    string `gorm:"not null;default:'';size:64;comment:被操作对象的类型(一般为db.Table名)" json:"objectType"`
	ObjectId      int    `gorm:"not null;default:0;comment:被操作对象类型(db.Table)下的具体对象的主键(id)" json:"ObjectId"`
	Metadata      string `gorm:"not null;type:text;comment:事件内容" json:"metadata"`
	Ctime         int64  `gorm:"not null;default:0;type:bigint;autoCreateTime;comment:事件发生时间" json:"ctime"`
	OperationName string `gorm:"-" json:"operationName"`
	SourceName    string `gorm:"-" json:"sourceName"`
}

func (Event) TableName() string {
	return TableEvent
}

func (a *Event) HandleOperationName() {
	a.OperationName = OperationMap[a.Operation]
}

func (a *Event) HandleSourceName() {
	a.SourceName = SourceMap[a.Source]
}

// abbr.  ->  fullName
// "Opn"  ->  "Operation"
// "mgt"  ->  "management"
const (
	OpnLocalUsersPwdChange = "local_user_pwd_change"

	OpnMigration = "system_setting_migration"

	OpnTablesDelete         = "opn_tables_delete"
	OpnTablesCreate         = "opn_tables_create"
	OpnTableCreateSelfBuilt = "opn_tables_create_self_built"
	OpnTablesUpdate         = "opn_tables_update"
	OpnTablesIndexUpdate    = "opn_tables_index_update"
	OpnTablesLogsQuery      = "opn_tables_logs_query"
	OpnDatabasesDelete      = "opn_databases_delete"
	OpnDatabasesCreate      = "opn_databases_create"
	OpnDatabasesUpdate      = "opn_databases_update"
	OpnInstancesDelete      = "opn_instances_delete"
	OpnInstancesCreate      = "opn_instances_create"
	OpnInstancesUpdate      = "opn_instances_update"
	OpnViewsDelete          = "opn_views_delete"
	OpnViewsCreate          = "opn_views_create"
	OpnViewsUpdate          = "opn_views_update"

	OpnConfigsDelete  = "opn_configs_delete"
	OpnConfigsCreate  = "opn_configs_create"
	OpnConfigsUpdate  = "opn_configs_update"
	OpnConfigsPublish = "opn_configs_publish"
	OpnConfigsSync    = "opn_configs_sync"

	OpnClustersDelete          = "opn_clusters_delete"
	OpnClustersCreate          = "opn_clusters_create"
	OpnClustersUpdate          = "opn_clusters_update"
	OpnClustersConfigMapDelete = "opn_clusters_config_map_delete"
	OpnClustersConfigMapCreate = "opn_clusters_config_map_create"
	OpnClustersConfigMapUpdate = "opn_clusters_config_map_update"

	OpnAlarmsDelete         = "opn_alarms_delete"
	OpnAlarmsCreate         = "opn_alarms_create"
	OpnAlarmsUpdate         = "opn_alarms_update"
	OpnAlarmsChannelsDelete = "opn_alarms_channels_delete"
	OpnAlarmsChannelsCreate = "opn_alarms_channels_create"
	OpnAlarmsChannelsUpdate = "opn_alarms_channels_update"
)

var OperationMap = map[string]string{
	OpnLocalUsersPwdChange: "Change the password",

	OpnTablesDelete:         "Table delete",
	OpnTablesCreate:         "Table create",
	OpnTablesUpdate:         "Table update",
	OpnTableCreateSelfBuilt: "An existing data table is connected",
	OpnTablesIndexUpdate:    "Table analysis field updates",
	OpnTablesLogsQuery:      "Log query",
	OpnDatabasesDelete:      "Database delete",
	OpnDatabasesCreate:      "Database create",
	OpnDatabasesUpdate:      "Database update",
	OpnInstancesDelete:      "Instance delete",
	OpnInstancesCreate:      "Instance create",
	OpnInstancesUpdate:      "Instance update",
	OpnViewsDelete:          "Custom time field delete",
	OpnViewsCreate:          "Custom time field create",
	OpnViewsUpdate:          "Custom time field update",

	OpnConfigsDelete:  "Config delete",
	OpnConfigsCreate:  "Config create",
	OpnConfigsUpdate:  "Config update",
	OpnConfigsPublish: "Config publish",
	OpnConfigsSync:    "Synchronize the configuration from the target cluster",

	OpnClustersDelete:          "Cluster delete",
	OpnClustersCreate:          "Cluster create",
	OpnClustersUpdate:          "Cluster update",
	OpnClustersConfigMapDelete: "Cluster configmap delete",
	OpnClustersConfigMapCreate: "Cluster configmap create",
	OpnClustersConfigMapUpdate: "Cluster configmap update",

	OpnAlarmsDelete:         "Alarm delete",
	OpnAlarmsCreate:         "Alarm create",
	OpnAlarmsUpdate:         "Alarm update",
	OpnAlarmsChannelsDelete: "Alarm channel delete",
	OpnAlarmsChannelsCreate: "Alarm channel create",
	OpnAlarmsChannelsUpdate: "Alarm channel update",

	OpnMigration: "The database table structure is upgraded",
}

const (
	SourceInquiryMgtCenter = "inquiry_mgt"
	SourceUserMgtCenter    = "user_mgt"
	SourceSystemSetting    = "system_setting"
	SourceClusterMgtCenter = "cluster_mgt"
	SourceAlarmMgtCenter   = "alarm_mgt"
	SourceConfigMgtCenter  = "config_mgt"
)

var (
	SourceMap = map[string]string{
		SourceInquiryMgtCenter: "Log Management Center",
		SourceUserMgtCenter:    "User Management Center",
		SourceSystemSetting:    "System Settings",
		SourceClusterMgtCenter: "K8s Management Center",
		SourceAlarmMgtCenter:   "Alarm Management Center",
		SourceConfigMgtCenter:  "Configuration Management Center",
	}
	SourceOpnMap = map[string][]string{
		SourceInquiryMgtCenter: {
			OpnTablesDelete,
			OpnTablesCreate,
			OpnTablesUpdate,
			OpnTablesIndexUpdate,
			OpnTablesLogsQuery,
			OpnDatabasesDelete,
			OpnDatabasesCreate,
			OpnDatabasesUpdate,
			OpnInstancesDelete,
			OpnInstancesCreate,
			OpnInstancesUpdate,
			OpnViewsDelete,
			OpnViewsCreate,
			OpnViewsUpdate,
		},
		SourceClusterMgtCenter: {
			OpnClustersDelete,
			OpnClustersCreate,
			OpnClustersUpdate,
		},
		SourceAlarmMgtCenter: {
			OpnAlarmsDelete,
			OpnAlarmsCreate,
			OpnAlarmsUpdate,
			OpnAlarmsChannelsDelete,
			OpnAlarmsChannelsCreate,
			OpnAlarmsChannelsUpdate,
		},
		SourceConfigMgtCenter: {
			OpnConfigsDelete,
			OpnConfigsCreate,
			OpnConfigsUpdate,
			OpnConfigsPublish,
		},
		SourceUserMgtCenter: {OpnLocalUsersPwdChange},
		SourceSystemSetting: {OpnMigration},
	}
)

type (
	UserIdName struct {
		ID       int
		Username string
	}

	RespAllEnums struct {
		SourceEnums    map[string]string `json:"sourceEnums"`
		OperationEnums map[string]string `json:"operationEnums"`
		UserEnums      map[int]string    `json:"userEnums"`
	}

	RespEnumsOfSource struct {
		TargetSource   string            `json:"targetSource"`
		OperationEnums map[string]string `json:"operationEnums"`
	}
)
