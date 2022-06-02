package template

import (
	"github.com/clickvisual/clickvisual/api/pkg/model/view"
)

// CLUSTER_NAME
var kafkaTopicORM = map[string]string{
	"app_stdout":     "app-stdout-logs-%s",
	"ego_stdout":     "ego-stdout-logs-%s",
	"ingress_stdout": "ingress-stdout-logs-%s",
	"ingress_stderr": "ingress-stderr-logs-%s",
}

var templateOneTable map[string][]view.IndexItem = map[string][]view.IndexItem{
	"app_stdout": []view.IndexItem{
		{
			Field: "application",
			Typ:   0,
		},
		{
			Field: "category",
			Typ:   0,
		},
		{
			Field: "level",
			Typ:   1,
		},
		{
			Field: "env",
			Typ:   0,
		},
		{
			Field: "lv",
			Typ:   0,
		},
		{
			Field: "method",
			Typ:   0,
		},
		{
			Field: "msg",
			Typ:   0,
		},
		{
			Field: "status",
			Typ:   1,
		},
		{
			Field: "step",
			Typ:   0,
		},
	},
	"ego_stdout": []view.IndexItem{
		{
			Field: "addr",
			Typ:   0,
		},
		{
			Field: "code",
			Typ:   1,
		},
		{
			Field: "comp",
			Typ:   1,
		},
		{
			Field: "compName",
			Typ:   0,
		},
		{
			Field: "cost",
			Typ:   2,
		},
		{
			Field: "event",
			Typ:   0,
		},
		{
			Field: "ip",
			Typ:   0,
		},
		{
			Field: "lv",
			Typ:   0,
		},
		{
			Field: "method",
			Typ:   0,
		},
		{
			Field: "msg",
			Typ:   0,
		},
		{
			Field: "name",
			Typ:   0,
		},
		{
			Field: "peerIp",
			Typ:   0,
		},
		{
			Field: "peerName",
			Typ:   0,
		},
		{
			Field: "tid",
			Typ:   0,
		},
		{
			Field: "ts",
			Typ:   2,
		},
		{
			Field: "type",
			Typ:   0,
		},
		{
			Field: "ucode",
			Typ:   1,
		},
	},
	"ingress_stdout": []view.IndexItem{
		{
			Field: "body_bytes_sent",
			Typ:   1,
		},
		{
			Field: "host",
			Typ:   0,
		},
		{
			Field: "proxy_upstream_name",
			Typ:   0,
		},
		{
			Field: "request_length",
			Typ:   1,
		},
		{
			Field: "request_time",
			Typ:   2,
		},
		{
			Field: "status",
			Typ:   1,
		},
		{
			Field: "upstream_response_time",
			Typ:   2,
		},
		{
			Field: "upstream_status",
			Typ:   1,
		},
		{
			Field: "url",
			Typ:   0,
		},
		{
			Field: "x_forward_for",
			Typ:   0,
		},
	},
	"ingress_stderr": []view.IndexItem{
		{
			Field: "body_bytes_sent",
			Typ:   1,
		},
		{
			Field: "host",
			Typ:   0,
		},
		{
			Field: "proxy_upstream_name",
			Typ:   0,
		},
		{
			Field: "request_length",
			Typ:   1,
		},
		{
			Field: "request_time",
			Typ:   2,
		},
		{
			Field: "status",
			Typ:   1,
		},
		{
			Field: "upstream_response_time",
			Typ:   2,
		},
		{
			Field: "upstream_status",
			Typ:   1,
		},
		{
			Field: "url",
			Typ:   0,
		},
		{
			Field: "x_forward_for",
			Typ:   0,
		},
	},
}
