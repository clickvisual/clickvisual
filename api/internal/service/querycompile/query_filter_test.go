package querycompile

import (
	"testing"

	"github.com/stretchr/testify/require"

	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
)

func TestQueryFiltersRejectQueriesThatCanEscapeTablePermissions(t *testing.T) {
	for _, query := range []string{
		"trace_id IN (SELECT trace_id FROM private_logs)",
		"1 = 1) UNION ALL SELECT * FROM private_logs --",
		"level = 'error'; SELECT * FROM private_logs",
		"level = 'error') OR 1 = 1 --",
		"level = 'error' /* ignore limit */",
		"dictGet('private_dictionary', 'secret', 1) = 'value'",
		"level = 'error' SETTINGS max_execution_time = 0",
	} {
		t.Run(query, func(t *testing.T) {
			req := view.QueryRequestV2{Query: query}
			ctx := CompileContext{TableName: "`public_logs`"}
			_, _, err := Compile(req, ctx)
			require.Error(t, err)
			_, _, err = CompileCount(req, ctx)
			require.Error(t, err)
		})
	}
}

func TestQueryFiltersPreserveSafeSingleTableConditions(t *testing.T) {
	for _, query := range []string{
		"", "*", "trace-123", "level = 'error'", "message NOT LIKE '%timeout%'",
		"level = 'error' AND duration > 1.5e2 OR status >= 500",
		"`body`.`message` = 'it''s a timeout'",
		`message = 'it\'s a timeout'`,
		"trace_id IN ('a', 'b') AND status NOT IN (200, 201)",
		"message IS NOT NULL AND retry = true",
		"message = 'SELECT secret FROM private_logs; -- literal content'",
	} {
		t.Run(query, func(t *testing.T) {
			_, _, err := Compile(view.QueryRequestV2{Query: query}, CompileContext{TableName: "`public_logs`"})
			require.NoError(t, err)
		})
	}
}
