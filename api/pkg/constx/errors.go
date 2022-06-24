package constx

import (
	"errors"

	"github.com/gotomicro/cetus/pkg/kerror"
)

var (
	// ErrAuthNeedLogin 00 middlewares errors
	ErrAuthNeedLogin      = &kerror.KError{Code: 10003, Message: "need_login"}
	ErrAuthUserLoginError = &kerror.KError{Code: 10004, Message: "user_login_error"}

	ErrSkipConfigureName           = &kerror.KError{Code: 10101, Message: "skipped synchronization file name"}
	ErrQueryFormatIllegal          = &kerror.KError{Code: 10102, Message: "query format is illegal"}
	ErrInstanceObj                 = &kerror.KError{Code: 10103, Message: "the current database is unavailable"}
	ErrConfigurationIsNoDifference = &kerror.KError{Code: 10104, Message: "save failed, no update at this time"}
	ErrAlarmRuleStoreIsClosed      = &kerror.KError{Code: 10105, Message: "alarm rule store is closed"}
	ErrClusterNameEmpty            = &kerror.KError{Code: 10106, Message: "error: cluster name is empty"}
	ErrQueryIntervalLimit          = &kerror.KError{Code: 10107, Message: "the current query time exceeds the configured limit"}

	ErrBigdataRTSyncTypeNotSupported         = &kerror.KError{Code: 10201, Message: "This type of synchronization operation is not supported"}
	ErrBigdataRTSyncOperatorTypeNotSupported = &kerror.KError{Code: 10202, Message: "This type of node operation is not supported "}
)

func New(msg string, err string) error {
	return errors.New(msg + err)
}
