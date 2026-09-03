package docs

import (
	_ "embed"
)

//go:embed openapi.json
var EGOGenAPI string
