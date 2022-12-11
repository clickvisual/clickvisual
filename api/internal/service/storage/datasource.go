package storage

import (
	"fmt"
)

type Datasource struct {
	database string
	table    string
}

func (d *Datasource) SetDatabase(database string) {
	d.database = database
}

func (d *Datasource) SetTable(table string) {
	d.table = table
}

func (d *Datasource) String() string {
	return fmt.Sprintf("`%s`.`%s`", d.database, d.table)
}
