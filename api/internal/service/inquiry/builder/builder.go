package builder

type Builder struct {
	SQL *SQL
}

func (b *Builder) New() {
	b.SQL = new(SQL)
}

func (b *Builder) Where() {
	b.SQL.Where = "1=1"
}
