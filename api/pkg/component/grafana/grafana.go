package grafana

import (
	"context"
	"fmt"

	"github.com/grafana-tools/sdk"
)

func New() {
	board := sdk.NewBoard("Sample dashboard title")
	board.ID = 1
	board.Time.From = "now-30m"
	board.Time.To = "now"
	row1 := board.AddRow("Sample row title")
	row1.Add(sdk.NewGraph("Sample graph"))
	graph := sdk.NewGraph("Sample graph 2")
	target := sdk.Target{
		RefID:      "A",
		Datasource: "Sample Source 1",
		Expr:       "sample request 1"}
	graph.AddTarget(&target)
	row1.Add(graph)
	grafanaURL := "http://grafana.host"
	c, _ := sdk.NewClient(grafanaURL, "grafana-api-key", sdk.DefaultHTTPClient)
	response, err := c.SetDashboard(context.TODO(), *board, sdk.SetDashboardParams{
		Overwrite: false,
	})
	if err != nil {
		fmt.Printf("error on uploading dashboard %s", board.Title)
	} else {
		fmt.Printf("dashboard URL: %v", grafanaURL+*response.URL)
	}
}
