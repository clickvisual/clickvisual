// Package testutil supplies fault-injecting SQL fixtures for backend tests.
package testutil

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"sync/atomic"
)

type SQLDriver struct {
	Query           func(context.Context, string) (driver.Rows, error)
	PrepareErr      error
	ExecErr         error
	Exec            func(context.Context) error
	Rollbacks       atomic.Int64
	StatementCloses atomic.Int64
}

func (d *SQLDriver) Open() *sql.DB { return sql.OpenDB(connector{d}) }

type connector struct{ d *SQLDriver }

func (c connector) Connect(context.Context) (driver.Conn, error) { return &connection{d: c.d}, nil }
func (c connector) Driver() driver.Driver                        { return driverWrapper{c.d} }
func (d *SQLDriver) OpenConn(string) (driver.Conn, error)        { return &connection{d: d}, nil }

// Open is supplied by driverWrapper because the fixture's Open returns a DB.
type driverWrapper struct{ d *SQLDriver }

func (w driverWrapper) Open(string) (driver.Conn, error) { return w.d.OpenConn("") }

type connection struct{ d *SQLDriver }

func (c *connection) Prepare(string) (driver.Stmt, error) {
	if c.d.PrepareErr != nil {
		return nil, c.d.PrepareErr
	}
	return &statement{d: c.d}, nil
}
func (c *connection) Close() error              { return nil }
func (c *connection) Begin() (driver.Tx, error) { return &transaction{d: c.d}, nil }
func (c *connection) QueryContext(ctx context.Context, q string, _ []driver.NamedValue) (driver.Rows, error) {
	return c.d.Query(ctx, q)
}

type transaction struct{ d *SQLDriver }

func (t *transaction) Commit() error   { return nil }
func (t *transaction) Rollback() error { t.d.Rollbacks.Add(1); return nil }

type statement struct{ d *SQLDriver }

func (s *statement) Close() error  { s.d.StatementCloses.Add(1); return nil }
func (s *statement) NumInput() int { return -1 }
func (s *statement) Exec([]driver.Value) (driver.Result, error) {
	return driver.RowsAffected(1), s.d.ExecErr
}
func (s *statement) ExecContext(ctx context.Context, _ []driver.NamedValue) (driver.Result, error) {
	if s.d.Exec != nil {
		return nil, s.d.Exec(ctx)
	}
	return driver.RowsAffected(1), s.d.ExecErr
}
func (s *statement) Query([]driver.Value) (driver.Rows, error) {
	return nil, errors.New("unexpected statement query")
}

type Rows struct {
	Names  []string
	Values [][]driver.Value
	Err    error
	Closed atomic.Bool
	index  int
}

func (r *Rows) Columns() []string { return r.Names }
func (r *Rows) Close() error      { r.Closed.Store(true); return nil }
func (r *Rows) Next(dst []driver.Value) error {
	if r.index == len(r.Values) {
		if r.Err != nil {
			return r.Err
		}
		return io.EOF
	}
	copy(dst, r.Values[r.index])
	r.index++
	return nil
}
