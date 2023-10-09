package resource

import (
	"net/http"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

func NotFound(err error) bool {
	if status, ok := err.(*k8serrors.StatusError); ok {
		if status.ErrStatus.Code == http.StatusNotFound {
			return true
		}
	}
	return false
}
