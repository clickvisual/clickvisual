package db

type Event struct {
	ID            int    `gorm:"primary_key,not null;AUTO_INCREMENT" json:"id"`
	Source        string `gorm:"not null;default:'';size:64;index:idx_source;comment:事件来源" json:"source"`
	UserName      string `gorm:"not null;default:'';size:32;comment:操作用户的名字" json:"userName"`
	UID           int64  `gorm:"not null;default:0;comment:操作用户的uid" json:"uid"`
	Operation     string `gorm:"not null;default:'';size:64;index:idx_operation;comment:操作名" json:"operation"`
	ObjectType    string `gorm:"not null;default:'';size:64;comment:被操作对象的类型(一般为db.Table名)" json:"objectType"`
	ObjectId      int    `gorm:"not null;default:0;comment:被操作对象类型(db.BaseTable)下的具体对象的主键(id)" json:"objectId"`
	Metadata      string `gorm:"not null;type:text;comment:事件内容" json:"metadata"`
	Ctime         int64  `gorm:"bigint;autoCreateTime;comment:创建时间" json:"ctime"`
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

	OpnBigDataNodeCreate        = "opn_big_data_node_create"
	OpnBigDataNodeUpdate        = "opn_big_data_node_update"
	OpnBigDataNodeDelete        = "opn_big_data_node_delete"
	OpnBigDataFolderCreate      = "opn_big_data_folder_create"
	OpnBigDataFolderUpdate      = "opn_big_data_folder_update"
	OpnBigDataFolderDelete      = "opn_big_data_folder_delete"
	OpnBigDataNodeCrontabCreate = "opn_big_data_node_crontab_create"
	OpnBigDataNodeCrontabUpdate = "opn_big_data_node_crontab_update"
	OpnBigDataNodeCrontabDelete = "opn_big_data_node_crontab_delete"
	OpnBigDataNodeCrontabStop   = "opn_big_data_node_crontab_stop"
	OpnBigDataNodeResultUpdate  = "opn_big_data_node_result_update"
	OpnBigDataWorkflowCreate    = "opn_big_data_workflow_create"
	OpnBigDataWorkflowUpdate    = "opn_big_data_workflow_update"
	OpnBigDataWorkflowDelete    = "opn_big_data_workflow_delete"
	OpnBigDataSourceCreate      = "opn_big_data_source_create"
	OpnBigDataSourceUpdate      = "opn_big_data_source_update"
	OpnBigDataSourceDelete      = "opn_big_data_source_delete"
	OpnBigDataNodeLock          = "opn_big_data_node_lock"
	OpnBigDataNodeUnlock        = "opn_big_data_node_unlock"
	OpnBigDataNodeRun           = "opn_big_data_node_run"
	OpnBigDataNodeStop          = "opn_big_data_node_strop"

	OpnUserCreate        = "opn_base_user_create"
	OpnUserDelete        = "opn_base_user_delete"
	OpnUserPasswordReset = "opn_base_user_password_reset"
	OpnUserPwdChange     = "user_pwd_change"
)

var OperationMap = map[string]string{
	OpnTablesDelete:         "table delete",
	OpnTablesCreate:         "table create",
	OpnTablesUpdate:         "table update",
	OpnTableCreateSelfBuilt: "an existing data table is connected",
	OpnTablesIndexUpdate:    "table analysis field updates",
	OpnTablesLogsQuery:      "log query",
	OpnDatabasesDelete:      "database delete",
	OpnDatabasesCreate:      "database create",
	OpnDatabasesUpdate:      "database update",
	OpnInstancesDelete:      "instance delete",
	OpnInstancesCreate:      "instance create",
	OpnInstancesUpdate:      "instance update",
	OpnViewsDelete:          "custom time field delete",
	OpnViewsCreate:          "custom time field create",
	OpnViewsUpdate:          "custom time field update",

	OpnConfigsDelete:  "config delete",
	OpnConfigsCreate:  "config create",
	OpnConfigsUpdate:  "config update",
	OpnConfigsPublish: "config publish",
	OpnConfigsSync:    "synchronize the configuration from the target cluster",

	OpnClustersDelete:          "cluster delete",
	OpnClustersCreate:          "cluster create",
	OpnClustersUpdate:          "cluster update",
	OpnClustersConfigMapDelete: "cluster configmap delete",
	OpnClustersConfigMapCreate: "cluster configmap create",
	OpnClustersConfigMapUpdate: "cluster configmap update",

	OpnAlarmsDelete:         "alarm delete",
	OpnAlarmsCreate:         "alarm create",
	OpnAlarmsUpdate:         "alarm update",
	OpnAlarmsChannelsDelete: "alarm channel delete",
	OpnAlarmsChannelsCreate: "alarm channel create",
	OpnAlarmsChannelsUpdate: "alarm channel update",

	OpnMigration: "upgrading the database structure",

	OpnBigDataNodeCreate:        "node create",
	OpnBigDataNodeUpdate:        "node update",
	OpnBigDataNodeDelete:        "node delete",
	OpnBigDataFolderCreate:      "folder create",
	OpnBigDataFolderUpdate:      "folder update",
	OpnBigDataFolderDelete:      "folder delete",
	OpnBigDataNodeCrontabCreate: "node crontab create",
	OpnBigDataNodeCrontabUpdate: "node crontab update",
	OpnBigDataNodeCrontabDelete: "node crontab delete",
	OpnBigDataNodeCrontabStop:   "node crontab stop",
	OpnBigDataNodeResultUpdate:  "node run result update",
	OpnBigDataWorkflowCreate:    "workflow create",
	OpnBigDataWorkflowUpdate:    "workflow update",
	OpnBigDataWorkflowDelete:    "workflow delete",
	OpnBigDataSourceCreate:      "source create",
	OpnBigDataSourceUpdate:      "source update",
	OpnBigDataSourceDelete:      "source delete",
	OpnBigDataNodeLock:          "node lock",
	OpnBigDataNodeUnlock:        "node unlock",
	OpnBigDataNodeRun:           "node run",
	OpnBigDataNodeStop:          "node stop",

	OpnUserCreate:        "user create",
	OpnUserDelete:        "user delete",
	OpnUserPasswordReset: "user password reset",
	OpnUserPwdChange:     "change the password",
}

const (
	SourceInquiryMgtCenter = "log_mgt"
	SourceUserMgtCenter    = "user_mgt"
	SourceSystemSetting    = "system_setting"
	SourceClusterMgtCenter = "cluster_mgt"
	SourceAlarmMgtCenter   = "alarm_mgt"
	SourceConfigMgtCenter  = "config_mgt"
	SourceBigDataMgtCenter = "bigdata_mgt"
)

var (
	SourceMap = map[string]string{
		SourceInquiryMgtCenter: "Log",
		SourceUserMgtCenter:    "User",
		SourceSystemSetting:    "System",
		SourceClusterMgtCenter: "K8s",
		SourceAlarmMgtCenter:   "Alarm",
		SourceConfigMgtCenter:  "Configuration",
		SourceBigDataMgtCenter: "Analysis",
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
		SourceUserMgtCenter: {OpnUserPwdChange, OpnUserCreate, OpnUserDelete, OpnUserPasswordReset},
		SourceSystemSetting: {OpnMigration},
		SourceBigDataMgtCenter: {
			OpnBigDataNodeCreate,
			OpnBigDataNodeUpdate,
			OpnBigDataNodeDelete,
			OpnBigDataFolderCreate,
			OpnBigDataFolderUpdate,
			OpnBigDataFolderDelete,
			OpnBigDataNodeCrontabCreate,
			OpnBigDataNodeCrontabUpdate,
			OpnBigDataNodeCrontabDelete,
			OpnBigDataNodeCrontabStop,
			OpnBigDataNodeResultUpdate,
			OpnBigDataWorkflowCreate,
			OpnBigDataWorkflowUpdate,
			OpnBigDataWorkflowDelete,
			OpnBigDataSourceCreate,
			OpnBigDataSourceUpdate,
			OpnBigDataSourceDelete,
			OpnBigDataNodeLock,
			OpnBigDataNodeUnlock,
			OpnBigDataNodeRun,
			OpnBigDataNodeStop},
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
