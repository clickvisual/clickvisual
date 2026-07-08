package query

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/clickvisual/clickvisual/api/cmd"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

const (
	defaultAddr   = "http://127.0.0.1:19001"
	defaultFormat = "jsonl"
	defaultLast   = "1h"
	defaultLimit  = 100
)

var CmdRun = &cobra.Command{
	Use:   "query",
	Short: "Query ClickVisual logs over HTTP",
}

type logsOptions struct {
	Addr      string
	Token     string
	TID       int
	Start     string
	End       string
	Last      string
	Limit     int
	Page      int
	Contains  []string
	Format    string
	TextField string
	Debug     bool
}

func init() {
	CmdRun.AddCommand(newLogsCommand())
	cmd.RootCommand.AddCommand(CmdRun)
}

func newLogsCommand() *cobra.Command {
	opts := logsOptions{}
	c := &cobra.Command{
		Use:   "logs",
		Short: "Read log rows with a ClickVisual query token",
		RunE: func(c *cobra.Command, args []string) error {
			return opts.run(c.OutOrStdout(), c.ErrOrStderr(), defaultTimeNow)
		},
	}
	c.Flags().StringVar(&opts.Addr, "addr", "", "ClickVisual server address, defaults to CLICKVISUAL_ADDR or http://127.0.0.1:19001")
	c.Flags().StringVar(&opts.Token, "token", "", "query token, defaults to CLICKVISUAL_QUERY_TOKEN")
	c.Flags().IntVar(&opts.TID, "tid", 0, "log table id")
	c.Flags().StringVar(&opts.Start, "start", "", "start time, accepts unix seconds, RFC3339, or \"2006-01-02 15:04:05\"")
	c.Flags().StringVar(&opts.End, "end", "", "end time, accepts unix seconds, RFC3339, or \"2006-01-02 15:04:05\"")
	c.Flags().StringVar(&opts.Last, "last", defaultLast, "relative time range used when --start is omitted, for example 15m, 1h, 24h")
	c.Flags().IntVar(&opts.Limit, "limit", defaultLimit, "maximum log rows, must be <= 500")
	c.Flags().IntVar(&opts.Page, "page", 1, "result page number")
	c.Flags().StringArrayVar(&opts.Contains, "contains", nil, "raw log substring filter, can be repeated")
	c.Flags().StringVar(&opts.Format, "format", defaultFormat, "output format: jsonl, json, or text")
	c.Flags().StringVar(&opts.TextField, "text-field", "", "field to print when --format=text")
	c.Flags().BoolVar(&opts.Debug, "debug", false, "print count, cost, sql, and warnings to stderr; with --format=json output the full response data")
	return c
}

func (o logsOptions) run(stdout io.Writer, stderr io.Writer, now func() time.Time) error {
	o.applyEnvDefaults()
	if err := o.validate(); err != nil {
		return err
	}
	req, err := o.buildRequest(now())
	if err != nil {
		return err
	}
	data, err := runTokenQuery(
		context.Background(),
		&http.Client{Timeout: 30 * time.Second},
		o.Addr,
		o.Token,
		req,
	)
	if err != nil {
		return err
	}
	if o.Debug && strings.ToLower(o.Format) != "json" {
		writeDebug(stderr, data)
	}
	return renderLogs(stdout, data, o.Format, o.TextField, o.Debug)
}

func (o *logsOptions) applyEnvDefaults() {
	if strings.TrimSpace(o.Addr) == "" {
		o.Addr = strings.TrimSpace(os.Getenv("CLICKVISUAL_ADDR"))
	}
	if strings.TrimSpace(o.Addr) == "" {
		o.Addr = defaultAddr
	}
	if strings.TrimSpace(o.Token) == "" {
		o.Token = strings.TrimSpace(os.Getenv("CLICKVISUAL_QUERY_TOKEN"))
	}
	if strings.TrimSpace(o.Format) == "" {
		o.Format = defaultFormat
	}
	if strings.TrimSpace(o.Last) == "" {
		o.Last = defaultLast
	}
	if o.Limit == 0 {
		o.Limit = defaultLimit
	}
	if o.Page == 0 {
		o.Page = 1
	}
}

func (o logsOptions) validate() error {
	if strings.TrimSpace(o.Token) == "" {
		return fmt.Errorf("--token or CLICKVISUAL_QUERY_TOKEN is required")
	}
	if o.TID <= 0 {
		return fmt.Errorf("--tid is required")
	}
	if o.Limit <= 0 || o.Limit > 500 {
		return fmt.Errorf("--limit must be between 1 and 500")
	}
	if o.Page <= 0 {
		return fmt.Errorf("--page must be greater than 0")
	}
	switch strings.ToLower(strings.TrimSpace(o.Format)) {
	case "jsonl", "json", "text":
		return nil
	default:
		return fmt.Errorf("--format must be jsonl, json, or text")
	}
}

func (o logsOptions) buildRequest(now time.Time) (tokenRunRequest, error) {
	if o.Limit == 0 {
		o.Limit = defaultLimit
	}
	if o.Page == 0 {
		o.Page = 1
	}
	st, et, err := o.timeRange(now)
	if err != nil {
		return tokenRunRequest{}, err
	}
	if !st.Before(et) {
		return tokenRunRequest{}, fmt.Errorf("start time must be before end time")
	}
	conditions := make([]view.QueryConditionV2, 0, len(o.Contains))
	for _, item := range o.Contains {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		conditions = append(conditions, view.QueryConditionV2{
			Field: view.QueryFieldRef{
				FieldKey:       "_raw_log_",
				DisplayName:    "_raw_log_",
				Source:         view.QueryFieldSourceColumn,
				Path:           "_raw_log_",
				ValueType:      view.QueryValueTypeString,
				IsAccelerated:  true,
				AcceleratedCol: "_raw_log_",
			},
			Operator: view.QueryOperatorContains,
			Value:    item,
		})
	}
	return tokenRunRequest{
		Tid:        o.TID,
		ST:         st.Unix(),
		ET:         et.Unix(),
		Page:       uint32(o.Page),
		PageSize:   uint32(o.Limit),
		Conditions: conditions,
	}, nil
}

func (o logsOptions) timeRange(now time.Time) (time.Time, time.Time, error) {
	var (
		st  time.Time
		et  time.Time
		err error
	)
	if strings.TrimSpace(o.End) != "" {
		et, err = parseFlexibleTime(o.End, now.Location())
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("parse --end: %w", err)
		}
	} else {
		et = now
	}
	if strings.TrimSpace(o.Start) != "" {
		st, err = parseFlexibleTime(o.Start, now.Location())
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("parse --start: %w", err)
		}
	} else {
		duration, durationErr := time.ParseDuration(o.Last)
		if durationErr != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("parse --last: %w", durationErr)
		}
		st = et.Add(-duration)
	}
	return st, et, nil
}

func parseFlexibleTime(value string, loc *time.Location) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("empty time")
	}
	if unix, err := strconv.ParseInt(value, 10, 64); err == nil {
		if unix > 100000000000 {
			unix = unix / 1000
		}
		return time.Unix(unix, 0).In(loc), nil
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed.In(loc), nil
	}
	for _, layout := range []string{
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
	} {
		if parsed, err := time.ParseInLocation(layout, value, loc); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported time %q", value)
}
