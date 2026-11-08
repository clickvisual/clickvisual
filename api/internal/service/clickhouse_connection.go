package service

import (
	"context"
	"crypto/tls"
	"database/sql"
	"database/sql/driver"
	"errors"
	"net"
	"sync/atomic"
	"time"

	chdriver "github.com/ClickHouse/clickhouse-go/v2"
)

// The pinned driver's sql.Open path calls Open with context.Background(). Use
// its connector instead, and interrupt native network reads on cancellation.
type clickHouseConnector struct{ options chdriver.Options }

func openClickHouseDB(dsn string) (*sql.DB, error) {
	options, err := chdriver.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	return sql.OpenDB(&clickHouseConnector{options: *options}), nil
}
func (c *clickHouseConnector) Driver() driver.Driver { return chdriver.Connector(&c.options).Driver() }
func (c *clickHouseConnector) Connect(ctx context.Context) (driver.Conn, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	options := c.options
	if options.Protocol == chdriver.HTTP {
		return chdriver.Connector(&options).Connect(ctx)
	}
	if options.DialTimeout == 0 {
		options.DialTimeout = time.Second
	}
	if deadline, ok := ctx.Deadline(); ok {
		options.DialTimeout = min(options.DialTimeout, time.Until(deadline))
	}
	var transports []net.Conn
	var stops []func() bool
	options.DialContext = func(ctx context.Context, address string) (net.Conn, error) {
		dialer := &net.Dialer{Timeout: options.DialTimeout}
		var conn net.Conn
		var err error
		if options.TLS != nil {
			conn, err = (&tls.Dialer{NetDialer: dialer, Config: options.TLS}).DialContext(ctx, "tcp", address)
		} else {
			conn, err = dialer.DialContext(ctx, "tcp", address)
		}
		if err != nil {
			return nil, err
		}
		transports = append(transports, conn)
		stops = append(stops, context.AfterFunc(ctx, func() { _ = conn.Close() }))
		return conn, nil
	}
	conn, err := chdriver.Connector(&options).Connect(ctx)
	for _, stop := range stops {
		stop()
	}
	for i, transport := range transports {
		if err != nil || ctx.Err() != nil || i < len(transports)-1 {
			_ = transport.Close()
		}
	}
	if ctx.Err() != nil {
		if conn != nil {
			_ = conn.Close()
		}
		return nil, ctx.Err()
	}
	if err != nil {
		return nil, err
	}
	return &clickHouseConn{nativeSQLConn: conn.(nativeSQLConn), transport: transports[len(transports)-1]}, nil
}

// Preserve the optional driver interfaces and column metadata used by ClickHouse.
type nativeSQLConn interface {
	driver.Conn
	driver.QueryerContext
	driver.ExecerContext
	driver.ConnPrepareContext
	driver.Pinger
	driver.NamedValueChecker
	driver.SessionResetter
}
type clickHouseConn struct {
	nativeSQLConn
	transport net.Conn
	canceled  atomic.Bool
}

func (c *clickHouseConn) interrupt(ctx context.Context) func() bool {
	return context.AfterFunc(ctx, func() { c.canceled.Store(true); _ = c.transport.Close() })
}
func (c *clickHouseConn) ResetSession(ctx context.Context) error {
	if c.canceled.Load() {
		return driver.ErrBadConn
	}
	return c.nativeSQLConn.ResetSession(ctx)
}
func (c *clickHouseConn) Ping(ctx context.Context) error {
	stop := c.interrupt(ctx)
	defer stop()
	return c.nativeSQLConn.Ping(ctx)
}
func (c *clickHouseConn) ExecContext(ctx context.Context, q string, args []driver.NamedValue) (driver.Result, error) {
	stop := c.interrupt(ctx)
	defer stop()
	return c.nativeSQLConn.ExecContext(ctx, q, args)
}
func (c *clickHouseConn) PrepareContext(ctx context.Context, q string) (driver.Stmt, error) {
	stop := c.interrupt(ctx)
	defer stop()
	return c.nativeSQLConn.PrepareContext(ctx, q)
}
func (c *clickHouseConn) BeginTx(ctx context.Context, opts driver.TxOptions) (driver.Tx, error) {
	if opts.Isolation != driver.IsolationLevel(0) || opts.ReadOnly {
		return nil, errors.New("clickhouse: unsupported transaction options")
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	stop := c.interrupt(ctx)
	tx, err := c.nativeSQLConn.Begin()
	if err != nil {
		stop()
		return nil, err
	}
	return &clickHouseTx{Tx: tx, stop: stop}, nil
}

type clickHouseTx struct {
	driver.Tx
	stop func() bool
}

func (t *clickHouseTx) Commit() error   { defer t.stop(); return t.Tx.Commit() }
func (t *clickHouseTx) Rollback() error { defer t.stop(); return t.Tx.Rollback() }
func (c *clickHouseConn) QueryContext(ctx context.Context, q string, args []driver.NamedValue) (driver.Rows, error) {
	stop := c.interrupt(ctx)
	rows, err := c.nativeSQLConn.QueryContext(ctx, q, args)
	if err != nil {
		stop()
		return nil, err
	}
	return &clickHouseRows{nativeSQLRows: rows.(nativeSQLRows), stop: stop}, nil
}

type nativeSQLRows interface {
	driver.Rows
	driver.RowsColumnTypeScanType
	driver.RowsColumnTypeDatabaseTypeName
	driver.RowsColumnTypeNullable
	driver.RowsColumnTypePrecisionScale
	driver.RowsNextResultSet
}
type clickHouseRows struct {
	nativeSQLRows
	stop func() bool
}

func (r *clickHouseRows) Close() error { defer r.stop(); return r.nativeSQLRows.Close() }
