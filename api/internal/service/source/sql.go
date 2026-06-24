package source

import (
	"fmt"
	"strings"
	"unicode"
)

func quoteSourceIdentifier(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("empty SQL identifier")
	}
	for _, ch := range value {
		if unicode.IsLetter(ch) || unicode.IsDigit(ch) {
			continue
		}
		switch ch {
		case '_', '-', '$', '.':
			continue
		default:
			return "", fmt.Errorf("invalid SQL identifier %q", value)
		}
	}
	return "`" + strings.ReplaceAll(value, "`", "``") + "`", nil
}
