package agent

import (
	"fmt"
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestAgentGetLogs(t *testing.T) {

	req := view.ReqQuery{
		ST:       1695286239,
		ET:       1696063839,
		Path:     "./ego.sys",
		PageSize: 10,
		Query:    "comp=core.econf and msg='read watch'",
	}

	agent := Agent{}
	resp, err := agent.GetLogs(req, 1)
	if err != nil {
		panic(err)
	}
	for _, log := range resp.Logs {
		fmt.Println(log)
	}

	fmt.Println("count: ", len(resp.Logs))
}
