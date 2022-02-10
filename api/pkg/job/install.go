package job

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/gotomicro/ego/core/econf"
	"github.com/gotomicro/ego/core/elog"
	"github.com/gotomicro/ego/task/ejob"

	"github.com/shimohq/mogo/api/internal/invoker"
	"github.com/shimohq/mogo/api/pkg/model/db"
)

func RunInstall(ctx ejob.Context) error {
	if err := installCH(); err != nil {
		return err
	}
	if err := installDB(); err != nil {
		return err
	}
	return nil
}

func installDB() error {
	ins := db.Instance{
		Datasource: "ch",
		Name:       "default-ch",
		Dsn:        econf.GetString("defaultCh.dsn"),
	}
	err := db.InstanceCreate(invoker.Db, &ins)
	if err != nil {
		elog.Error("insert to index fail", elog.FieldErr(err))
		return err
	}
	return nil
}

func installCH() error {
	conn, err := sql.Open("clickhouse", econf.GetString("defaultCh.dsn"))
	if err != nil {
		elog.Error("conn to clickhouse fail", elog.String("dsn", econf.GetString("defaultCh.dsn")), elog.FieldErr(err))
		return err
	}
	if err := conn.Ping(); err != nil {
		elog.Error("ping clickhouse fail", elog.FieldErr(err))
		return err
	}

	// create demo_log table
	_, err = conn.Exec(`
		CREATE TABLE IF NOT EXISTS demo_log (
			time DateTime, 
			host String,
			url String, 
			client_ip String,
			status UInt16
		) ENGINE = MergeTree PARTITION BY toYYYYMMDD(time) ORDER BY (time)
	`)
	if err != nil {
		elog.Error("create table fail", elog.FieldErr(err))
		return err
	}

	// insert rows to demo_log
	vals := [][]interface{}{
		{time.Now().Add(-1 * time.Minute), "https://mogo.io/path1", "/path1", "127.0.0.1", 200},
		{time.Now().Add(-2 * time.Minute), "https://mogo.io/path2", "/path2", "127.0.0.1", 400},
		{time.Now().Add(-3 * time.Minute), "https://mogo.io/path1", "/path1", "127.0.0.1", 500},
	}
	query := `INSERT INTO demo_log (time, host, url, client_ip, status) VALUES (?,?,?,?,?)`
	var tx, _ = conn.Begin()
	fmt.Println("query---------", query)
	var stmt, _ = tx.Prepare(query)
	defer stmt.Close()

	for _, val := range vals {
		if _, err := stmt.Exec(val...); err != nil {
			elog.Error("exec fail", elog.FieldErr(err))
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		elog.Error("exec fail", elog.FieldErr(err))
		return err
	}

	return nil
}
