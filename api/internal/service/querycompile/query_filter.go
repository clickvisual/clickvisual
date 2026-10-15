package querycompile

import "regexp"

// Raw filters support a bounded single-table condition language. In particular,
// identifiers cannot be expressions, functions, subqueries, or SQL statements.
const (
	filterIdentifier = "(?:[A-Za-z_][A-Za-z0-9_]*|`[A-Za-z_][A-Za-z0-9_]*`)(?:\\.(?:[A-Za-z_][A-Za-z0-9_]*|`[A-Za-z_][A-Za-z0-9_]*`))*"
	filterLiteral    = `(?:'(?:[^'\\]|\\.|'')*'|[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?|TRUE|FALSE|NULL)`
	filterCondition  = filterIdentifier + `\s*(?:(?:!=|<>|<=|>=|=|<|>|\bLIKE\b|\bNOT\s+LIKE\b)\s*` + filterLiteral +
		`|\bIS\s+(?:NOT\s+)?NULL\b|\b(?:NOT\s+)?IN\s*\(\s*` + filterLiteral + `(?:\s*,\s*` + filterLiteral + `)*\s*\))`
)

var queryFilterPattern = regexp.MustCompile(`(?is)^` + filterCondition + `(?:\s+(?:AND|OR)\s+` + filterCondition + `)*$`)
