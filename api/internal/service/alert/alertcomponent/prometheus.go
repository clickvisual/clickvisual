package alertcomponent

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"

	"github.com/clickvisual/clickvisual/api/pkg/model/db"
)

var _ Component = (*Prometheus)(nil)

// Prometheus Object resource pool
var prometheusResourcePool sync.Map

type Prometheus struct {
	url           string
	ruleStoreType int
}

func NewPrometheus(url string, ruleStoreType int) (*Prometheus, error) {
	url = strings.TrimSuffix(url, "/")
	key := fmt.Sprintf("%s_%d", url, ruleStoreType)
	if v, ok := prometheusResourcePool.Load(key); ok {
		if v == nil {
			return nil, errors.Wrap(ErrNilObject, "new prometheus")
		}
		if obj, typeOk := v.(*Prometheus); typeOk {
			return obj, nil
		}
		return nil, errors.Wrap(ErrNilObject, "v.(*Prometheus)")
	}
	p := &Prometheus{url: url, ruleStoreType: ruleStoreType}
	prometheusResourcePool.Store(key, p)
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
		// 跳过 dns 无法解析的报错
		if strings.Contains(err.Error(), "dial tcp: lookup") {
			return nil
		}
		return err
	}
	return nil
}

// CheckDependents prometheus dependent components
// AlertManager
func (p *Prometheus) CheckDependents() error {
	urls, err := p.alertmanagerURLs()
	if err != nil {
		if p.ruleStoreType == db.RuleStoreTypeK8sOperator {
			return ErrCheckNotSupported
		}
		return err
	}
	if len(urls) == 0 {
		if p.ruleStoreType == db.RuleStoreTypeK8sOperator {
			return ErrCheckNotSupported
		}
		return errors.Wrap(ErrPrometheusDependsEmpty, "webhook configuration is empty")
	}
	components := make([]Component, 0)
	for _, url := range urls {
		am, errNewAM := NewAlertManager(url)
		if errNewAM != nil {
			return errNewAM
		}
		if err = am.Health(); err != nil {
			if strings.Contains(err.Error(), "dial tcp: lookup") {
				return nil
			}
			return errors.WithMessage(err, "alertmanager")
		}
		components = append(components, am)
	}
	return nil
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

type prometheusApiV1Alertmanagers struct {
	Status string `json:"status"`
	Data   struct {
		ActiveAlertmanagers []struct {
			URL string `json:"url"`
		} `json:"activeAlertmanagers"`
	} `json:"data"`
}

func (p *Prometheus) configuration() (prometheusConfiguration, error) {
	var res prometheusConfiguration
	client := resty.New()
	resp, err := client.R().Get(p.url + "/api/v1/status/config")
	if err != nil {
		return res, errors.Wrap(err, "http.Get status config")
	}
	var result prometheusApiV1StatusConfigResp
	if err = json.Unmarshal(resp.Body(), &result); err != nil {
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

func (p *Prometheus) alertmanagerURLs() ([]string, error) {
	var res prometheusApiV1Alertmanagers
	client := resty.New()
	resp, err := client.R().Get(p.url + "/api/v1/alertmanagers")
	if err != nil {
		return nil, errors.Wrap(err, "http.Get alertmanagers")
	}
	if err = json.Unmarshal(resp.Body(), &res); err != nil {
		return nil, errors.Wrap(err, "json.Unmarshal")
	}
	if res.Status != "success" {
		return nil, errors.Wrap(ErrPrometheusApiResponse, res.Status)
	}
	urls := make([]string, len(res.Data.ActiveAlertmanagers))
	for i := range res.Data.ActiveAlertmanagers {
		urls[i] = strings.TrimSuffix(res.Data.ActiveAlertmanagers[i].URL, "/api/v2/alerts")
	}
	return urls, nil
}

type prometheusApiV1RulesResp struct {
	Status string `json:"status"`
	Data   struct {
		Groups []struct {
			Name  string `json:"name"`
			File  string `json:"file"`
			Rules []struct {
				State    string `json:"state"`
				Name     string `json:"name"`
				Query    string `json:"query"`
				Duration int    `json:"duration"`
				Labels   struct {
                    Service string `json:"service"`
					Severity string `json:"severity"`
				} `json:"labels"`
				Annotations struct {
					Description string `json:"description"`
					Summary     string `json:"summary"`
                    Mobiles     string `json:"mobiles"`
				} `json:"annotations"`
				Alerts         []interface{} `json:"alerts"`
				Health         string        `json:"health"`
				EvaluationTime float64       `json:"evaluationTime"`
				LastEvaluation time.Time     `json:"lastEvaluation"`
				Type           string        `json:"type"`
			} `json:"rules"`
			Interval       int       `json:"interval"`
			Limit          int       `json:"limit"`
			EvaluationTime float64   `json:"evaluationTime"`
			LastEvaluation time.Time `json:"lastEvaluation"`
		} `json:"groups"`
	} `json:"data"`
}

func (p *Prometheus) IsRuleTakeEffect(rules []string) (bool, error) {
	// AlertManager
	resp, err := http.Get(p.url + "/api/v1/rules")
	if err != nil {
		return false, errors.Wrap(err, "http.Get")
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, errors.Wrap(err, "io.ReadAll")
	}
	var result prometheusApiV1RulesResp
	if err = json.Unmarshal(body, &result); err != nil {
		return false, errors.Wrap(err, "json.Unmarshal")
	}
	if result.Status != "success" {
		return false, errors.Wrap(ErrPrometheusApiResponse, result.Status)
	}
	ruleMap := make(map[string]interface{})
	for _, group := range result.Data.Groups {
		for _, rule := range group.Rules {
			ruleMap[rule.Name] = struct{}{}
		}
	}
	flag := true
	for _, rule := range rules {
		rule = strings.TrimPrefix(rule, "cv-")
		rule = strings.TrimSuffix(rule, ".yaml")
		rule = strings.ReplaceAll(rule, "-", "_")
		if _, ok := ruleMap[rule]; !ok {
			flag = false
			break
		}
	}
	if flag {
		return true, nil
	}
	return false, nil
}
