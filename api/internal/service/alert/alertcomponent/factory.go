package alertcomponent

import (
	"net"
	"strings"
	"time"

	"github.com/pkg/errors"
)

var (
	ErrNilObject              = errors.New("There is something wrong with the object in the resource pool")
	ErrIllegalAddress         = errors.New("The access address is illegal")
	ErrPrometheusApiResponse  = errors.New("Prometheus API request error")
	ErrPrometheusDependsEmpty = errors.New("Prometheus does not configure alertmanager")
)

type Component interface {
	Health() error
	CheckDependents() error
}

func sim2telnet(url string) error {
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	if url == "" {
		return errors.Wrap(ErrIllegalAddress, "sim2telnet")
	}
	_, err := net.DialTimeout("tcp", url, time.Second*3)
	if err != nil {
		return errors.Wrap(err, "sim2telnet")
	}
	return nil
}
