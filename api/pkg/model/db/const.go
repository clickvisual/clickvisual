package db

// abbr.  ->  fullName
// "Opn"  ->  "Operation"
// "mgt"  ->  "management"
const (
	// Operations of SourceUserMgtCenter
	OpnLocalUserCreate    = "local_user_create"
	OpnLocalUserDelete    = "local_user_delete"
	OpnLocalUserUpdate    = "local_user_update"
	OpnLocalUserPwdChange = "local_user_pwd_change"
	OpnLocalUserPwdReset  = "local_user_pwd_reset"

	OpnLogTableDelete = "log_table_delete"
)

var OperationMap = map[string]string{
	OpnLocalUserCreate:    "本地用户新增",
	OpnLocalUserDelete:    "本地用户删除",
	OpnLocalUserUpdate:    "本地用户更新",
	OpnLocalUserPwdChange: "本地用户密码更改",
	OpnLocalUserPwdReset:  "本地用户密码重制",
	OpnLogTableDelete:     "数据表删除",
}

const (
	SourceLogMgtCenter  = "log_mgt"
	SourceUserMgtCenter = "user_mgt"
)

var (
	SourceMap = map[string]string{
		SourceLogMgtCenter:  "日志管理中心",
		SourceUserMgtCenter: "用户管理中心",
	}
	SourceOpnMap = map[string][]string{
		SourceLogMgtCenter: {OpnLogTableDelete},
		SourceUserMgtCenter: {OpnLocalUserCreate, OpnLocalUserDelete, OpnLocalUserUpdate,
			OpnLocalUserPwdChange, OpnLocalUserPwdReset},
	}
)
