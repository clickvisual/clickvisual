package constx

import (
	"github.com/gotomicro/cetus/pkg/kerror"
)

var (
	ErrEmptyData                    = &kerror.KError{Code: 10001, Message: "empty data"}
	ErrPmsCheck                     = &kerror.KError{Code: 10002, Message: "Authentication failed"}
	ErrorUserOauthTypeIsNotPassword = &kerror.KError{Code: 10005, Message: "user oauth type is not user/password"}
	ErrorRepeatUserName             = &kerror.KError{Code: 10006, Message: "repeat username"}

	ErrSkipConfigureName           = &kerror.KError{Code: 10101, Message: "Skipped synchronization file name"}
	ErrQueryFormatIllegal          = &kerror.KError{Code: 10102, Message: "Query format is illegal"}
	ErrInstanceObj                 = &kerror.KError{Code: 10103, Message: "The current database is unavailable"}
	ErrConfigurationIsNoDifference = &kerror.KError{Code: 10104, Message: "Save failed, no update at this time"}
	ErrAlarmRuleStoreIsClosed      = &kerror.KError{Code: 10105, Message: "The alarm storage is not configured"}
	ErrClusterNameEmpty            = &kerror.KError{Code: 10106, Message: "Error: cluster name is empty"}
	ErrQueryIntervalLimit          = &kerror.KError{Code: 10107, Message: "The current query time exceeds the configured limit"}

	ErrBigdataRTSyncTypeNotSupported         = &kerror.KError{Code: 10201, Message: "This type of synchronization operation is not supported"}
	ErrBigdataRTSyncOperatorTypeNotSupported = &kerror.KError{Code: 10202, Message: "This type of node operation is not supported "}
	ErrBigdataNotSupportNodeType             = &kerror.KError{Code: 10203, Message: "Node type is not supported"}
	ErrDagExecFailed                         = &kerror.KError{Code: 10204, Message: "DAG execution failed"}
)
