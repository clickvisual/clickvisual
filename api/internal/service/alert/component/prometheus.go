package component

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"
)

var _ Component = (*Prometheus)(nil)

// Prometheus Object resource pool
var prometheusResourcePool sync.Map

type Prometheus struct {
	url string
}

func NewPrometheus(url string) (*Prometheus, error) {
	url = strings.TrimSuffix(url, "/")
	if v, ok := prometheusResourcePool.Load(url); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new prometheus")
		}
		if obj, typeOk := v.(*Prometheus); typeOk {
			return obj, nil
		}
		return nil, errors.Wrap(ErrNilObject, "v.(*Prometheus)")
	}
	p := &Prometheus{url: url}
	prometheusResourcePool.Store(url, p)
	return p, nil
}

func (p *Prometheus) Health() error {
	if err := sim2telnet(p.url); err != nil {
		return err
	}
	// reload check
	if err := p.checkLifecycleAPI(); err != nil {
		return err
	}
	// remote read check
	if err := p.checkRemoteReadUrls(); err != nil {
		return err
	}
	return nil
}

// CheckDependents prometheus dependent components
// AlertManager
func (p *Prometheus) CheckDependents() error {
	configuration, err := p.configuration()
	if err != nil {
		return err
	}
	urls := make([]string, 0)
	for _, alertmanager := range configuration.Alerting.AlertManagers {
		for _, staticConfig := range alertmanager.StaticConfigs {
			urls = append(urls, staticConfig.Targets...)
		}
	}
	if len(urls) == 0 {
		return errors.Wrap(ErrPrometheusDependsEmpty, "0")
	}
	components := make([]Component, 0)
	for _, url := range urls {
		am, errNewAM := NewAlertManager(url)
		if errNewAM != nil {
			return errNewAM
		}
		if err = am.Health(); err != nil {
			return errors.WithMessage(err, "alertmanager")
		}
		components = append(components, am)
	}
	return nil
}

type prometheusApiV1AlertmanagersResp struct {
	Status string `json:"status"`
	Data   struct {
		ActiveAlertmanagers []struct {
			Url string `json:"url"`
		} `json:"activeAlertmanagers"`
		DroppedAlertmanagers []interface{} `json:"droppedAlertmanagers"`
	} `json:"data"`
}

func (p *Prometheus) checkLifecycleAPI() error {
	resp, err := http.Post(p.url+"/-/reload", "text/html;charset=utf-8", nil)
	if err != nil {
		return errors.Wrap(err, "http.Post")
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return errors.Wrap(err, "io.ReadAll")
	}
	if string(body) == "Lifecycle API is not enabled." {
		return errors.New("Lifecycle API is not enabled.")
	}
	return nil
}

func (p *Prometheus) checkRemoteReadUrls() error {
	configuration, err := p.configuration()
	if err != nil {
		return err
	}
	for _, conf := range configuration.RemoteRead {
		url := strings.TrimPrefix(conf.Url, "http://")
		url = strings.TrimPrefix(url, "https://")
		url = strings.TrimSuffix(url, "/read")
		if err = sim2telnet(url); err != nil {
			return errors.WithMessage(err, "remote_read check failed")
		}
	}
	return nil
}

func (p *Prometheus) configuration() (prometheusConfiguration, error) {
	var res prometheusConfiguration
	// AlertManager
	resp, err := http.Get(p.url + "/api/v1/status/config")
	if err != nil {
		return res, errors.Wrap(err, "http.Get alertmanagers")
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return res, errors.Wrap(err, "io.ReadAll")
	}
	var result prometheusApiV1StatusConfigResp
	if err = json.Unmarshal(body, &result); err != nil {
		return res, errors.Wrap(err, "json.Unmarshal")
	}
	if result.Status != "success" {
		return res, errors.Wrap(ErrPrometheusApiResponse, result.Status)
	}
	if err = yaml.Unmarshal([]byte(result.Data.Yaml), &res); err != nil {
		return res, errors.Wrap(err, "yaml.Unmarshal")
	}
	return res, nil
}

type prometheusApiV1StatusConfigResp struct {
	Status string `json:"status"`
	Data   struct {
		Yaml string `json:"yaml"`
	} `json:"data"`
}

type prometheusConfiguration struct {
	Alerting struct {
		AlertManagers []struct {
			StaticConfigs []struct {
				Targets []string `yaml:"targets"`
			} `yaml:"static_configs"`
		} `yaml:"alertmanagers"`
	} `yaml:"alerting"`
	RemoteRead []struct {
		Url                  string `yaml:"url"`
		RemoteTimeout        string `yaml:"remote_timeout"`
		ReadRecent           bool   `yaml:"read_recent"`
		FollowRedirects      bool   `yaml:"follow_redirects"`
		FilterExternalLabels bool   `yaml:"filter_external_labels"`
	} `yaml:"remote_read"`
}
