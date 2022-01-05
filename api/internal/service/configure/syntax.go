package configure

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/link-duan/toml"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"

	"github.com/shimohq/mogo/api/pkg/model/view"
)

type (
	syntaxChecker func(content string) error
	SyntaxError   struct {
		LineNumber int
		Message    string
	}
)

var (
	syntaxCheckers = map[view.ConfigFormat]syntaxChecker{
		view.ConfigFormatToml: tomlChecker,
		view.ConfigFormatYaml: yamlChecker,
		view.ConfigFormatIni:  iniChecker,
		view.ConfigFormatJson: jsonChecker,
	}
)

func (s SyntaxError) Error() string {
	return fmt.Sprintf("syntax error. near line %d. %s", s.LineNumber, s.Message)
}

func CheckSyntax(format view.ConfigFormat, content string) error {
	checker, ok := syntaxCheckers[format]
	if !ok {
		return nil
	}

	return checker(content)
}

func tomlChecker(content string) error {
	var target interface{}
	_, err := toml.Decode(content, &target)
	if err != nil {
		if parseErr, ok := err.(toml.ParseError); ok {
			return SyntaxError{
				LineNumber: parseErr.Line,
				Message:    fmt.Sprintf("last key is %s", parseErr.LastKey),
			}
		}
		return err
	}

	return nil
}

func yamlChecker(content string) error {
	var target interface{}
	decoder := yaml.NewDecoder(strings.NewReader(content))
	err := decoder.Decode(&target)
	if err != nil {
		return err
	}

	return nil
}

func iniChecker(content string) error {
	sectionRegex := regexp.MustCompile("^\\[[^\\[]+]$")
	keyValueRegex := regexp.MustCompile("\\w+[\\s]*=[\\s]*.*")

	lines := strings.Split(content, "\n")
	for lineNumber, line := range lines {
		line = strings.Trim(line, " \\r\\n\\t")

		// skip blank line
		if line == "" {
			continue
		}

		// check if section
		matched := sectionRegex.MatchString(line)
		if matched {
			continue
		}

		// check key value syntax
		matched = keyValueRegex.MatchString(line)
		if !matched {
			return SyntaxError{
				LineNumber: lineNumber,
				Message:    "invalid syntax",
			}
		}
	}

	return nil
}

func jsonChecker(content string) error {
	var __ interface{}
	err := json.Unmarshal([]byte(content), &__)
	if err != nil {
		return errors.Wrap(err, "JSON 语法错误")
	}

	return nil
}
