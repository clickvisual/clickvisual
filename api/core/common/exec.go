package common

import (
	"database/sql"

	"github.com/pkg/errors"
)

func Exec(conn *sql.DB, sqls []string) error {
	for _, sq := range sqls {
		if sq == "" {
			continue
		}
		if _, err := conn.Exec(sq); err != nil {
			return errors.Wrapf(err, "error sql is: %s", sq)
		}
	}
	return nil
}

type GenSQL func() (name string, sql string)

func AppendSQL(names, sqls *[]string, opt GenSQL) {
	n, s := opt()
	if n != "" {
		*names = append(*names, n)
	}
	if s != "" {
		*sqls = append(*sqls, s)
	}
}
