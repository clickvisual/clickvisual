package alertmanager

import (
	"github.com/shimohq/mogo/api/pkg/model/view"
)

type Operator interface {
	Send(notification view.Notification, robot string) (err error)
}
