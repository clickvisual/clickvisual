package databend

import (
	"bytes"
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"sync"

	"github.com/clickvisual/clickvisual/api/internal/pkg/queryguard"
	godatabend "github.com/databendcloud/databend-go"
)

// OpenDB keeps the pinned driver's write/batch behavior, while replacing its
// context-free HTTP query path. No global transport or driver state is changed.
func OpenDB(dsn string) (*sql.DB, error) {
	cfg, err := godatabend.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	// v0.2.1 does not expose its named TLS registry to query transports. Refuse
	// this unsupported option rather than silently ignoring a TLS requirement.
	if cfg.TLSConfig != "" {
		return nil, fmt.Errorf("databend contextual queries do not support named tls_config")
	}
	return sql.OpenDB(&queryConnector{cfg: *cfg}), nil
}

type queryConnector struct{ cfg godatabend.Config }

func (c *queryConnector) Driver() driver.Driver { return &godatabend.DatabendDriver{} }
func (c *queryConnector) Connect(ctx context.Context) (driver.Conn, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	base, err := (&godatabend.DatabendDriver{}).OpenWithConfig(ctx, c.cfg)
	if err != nil {
		return nil, err
	}
	scheme := "https"
	if c.cfg.SSLMode == "disable" {
		scheme = "http"
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	return &queryConn{DatabendConn: base.(*godatabend.DatabendConn), cfg: c.cfg,
		endpoint: scheme + "://" + c.cfg.Host, transport: transport,
		client: &http.Client{Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}

type queryConn struct {
	*godatabend.DatabendConn
	cfg       godatabend.Config
	endpoint  string
	transport *http.Transport
	client    *http.Client
}

func (c *queryConn) Close() error { c.transport.CloseIdleConnections(); return c.DatabendConn.Close() }
func (c *queryConn) Ping(ctx context.Context) error {
	rows, err := c.QueryContext(ctx, "SELECT 1", nil)
	if err != nil {
		return err
	}
	return rows.Close()
}
func (c *queryConn) Query(q string, args []driver.Value) (driver.Rows, error) {
	named := make([]driver.NamedValue, len(args))
	for i, v := range args {
		named[i] = driver.NamedValue{Ordinal: i + 1, Value: v}
	}
	return c.QueryContext(context.Background(), q, named)
}
func (c *queryConn) QueryContext(ctx context.Context, q string, args []driver.NamedValue) (driver.Rows, error) {
	// All ClickVisual reader SQL is already constructed without bind arguments.
	// Returning ErrSkip here would fall back to the unbounded prepared path.
	if len(args) > 0 {
		return nil, fmt.Errorf("databend contextual query does not accept bind arguments")
	}
	ctx, cancel := queryguard.WithTimeout(ctx)
	resp, err := c.request(ctx, http.MethodPost, "/v1/query", "", godatabend.QueryRequest{SQL: q, Pagination: godatabend.Pagination{WaitTime: 90}})
	if err != nil {
		err = queryguard.Error(ctx, err)
		cancel()
		return nil, err
	}
	// Columns must be known before database/sql exposes the Rows to callers.
	for len(resp.Schema.Fields) == 0 && resp.NextURI != "" {
		resp, err = c.request(ctx, http.MethodGet, resp.NextURI, resp.Id, nil)
		if err != nil {
			err = queryguard.Error(ctx, err)
			cancel()
			return nil, err
		}
	}
	rows := &queryRows{conn: c, ctx: ctx, cancel: cancel, resp: resp}
	for _, field := range resp.Schema.Fields {
		desc, err := godatabend.ParseTypeDesc(field.DataType.Type)
		if err != nil {
			rows.Close()
			return nil, err
		}
		parser, err := godatabend.NewDataParser(desc, &godatabend.DataParserOptions{})
		if err != nil {
			rows.Close()
			return nil, err
		}
		rows.columns = append(rows.columns, field.Name)
		rows.types = append(rows.types, field.DataType.Type)
		rows.parsers = append(rows.parsers, parser)
	}
	return rows, nil
}
func (c *queryConn) request(ctx context.Context, method, path, id string, payload any) (*godatabend.QueryResponse, error) {
	// Pagination URIs must remain relative to this authenticated instance.
	u, err := url.Parse(path)
	if err != nil || u.IsAbs() || u.Host != "" || !strings.HasPrefix(path, "/") {
		return nil, fmt.Errorf("invalid databend query URI")
	}
	var body []byte
	if payload != nil {
		body, err = json.Marshal(payload)
		if err != nil {
			return nil, err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, c.endpoint+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json")
	req.Header.Set(godatabend.WarehouseRoute, "warehouse")
	req.Header.Set(godatabend.DatabendTenantHeader, c.cfg.Tenant)
	req.Header.Set(godatabend.DatabendWarehouseHeader, c.cfg.Warehouse)
	req.Header.Set("queryID", id)
	if c.cfg.User != "" {
		req.SetBasicAuth(c.cfg.User, c.cfg.Password)
	} else if c.cfg.AccessToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.cfg.AccessToken)
	} else {
		return nil, fmt.Errorf("no databend user or access token")
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("databend HTTP status %d", resp.StatusCode)
	}
	result := new(godatabend.QueryResponse)
	if err = json.NewDecoder(resp.Body).Decode(result); err != nil {
		return nil, err
	}
	if result.Error != nil {
		return nil, result.Error
	}
	return result, nil
}

type queryRows struct {
	conn           *queryConn
	ctx            context.Context
	cancel         context.CancelFunc
	resp           *godatabend.QueryResponse
	columns, types []string
	parsers        []godatabend.DataParser
	closeOnce      sync.Once
}

func (r *queryRows) Columns() []string { return r.columns }

// Closing never fetches another page. Cancellation immediately stops in-flight
// response reads, and lets database/sql return the connection to the pool.
func (r *queryRows) Close() error                            { r.closeOnce.Do(r.cancel); return nil }
func (r *queryRows) ColumnTypeScanType(i int) reflect.Type   { return r.parsers[i].Type() }
func (r *queryRows) ColumnTypeDatabaseTypeName(i int) string { return r.types[i] }
func (r *queryRows) Next(dest []driver.Value) error {
	for len(r.resp.Data) == 0 {
		if err := r.ctx.Err(); err != nil {
			return err
		}
		if r.resp.NextURI == "" {
			return io.EOF
		}
		resp, err := r.conn.request(r.ctx, http.MethodGet, r.resp.NextURI, r.resp.Id, nil)
		if err != nil {
			return queryguard.Error(r.ctx, err)
		}
		r.resp = resp
	}
	row := r.resp.Data[0]
	r.resp.Data = r.resp.Data[1:]
	if len(row) != len(r.parsers) {
		return fmt.Errorf("databend row/schema column count mismatch")
	}
	for i, v := range row {
		if v == nil {
			dest[i] = nil
			continue
		}
		value, err := r.parsers[i].Parse(strings.NewReader(fmt.Sprint(v)))
		if err != nil {
			return err
		}
		dest[i] = value
	}
	return nil
}
