package search

import (
	"fmt"
	"strings"

	"github.com/fatih/color"
)

type Bash struct {
	White   func(a ...interface{}) string
	Yellow  func(a ...interface{}) string
	Blue    func(a ...interface{}) string
	Green   func(a ...interface{}) string
	HiWrite func(a ...interface{}) string
	HiRed   func(a ...interface{}) string
}

func NewBash() *Bash {
	return &Bash{
		White:   color.New(color.FgWhite).SprintFunc(),
		Yellow:  color.New(color.FgYellow).SprintFunc(),
		Green:   color.New(color.FgGreen).SprintFunc(),
		Blue:    color.New(color.FgBlue).SprintFunc(),
		HiWrite: color.New(color.FgBlack, color.BgGreen).SprintFunc(),
		HiRed:   color.New(color.FgBlack, color.BgRed).SprintFunc(),
	}
}

func (b *Bash) ColorWord(word, line string) string {
	index := strings.Index(line, word)
	if index == -1 {
		return line
	}

	startLine := line[0:index]
	endLine := line[index+len(word):]

	return fmt.Sprintf("%v%v%v", startLine, b.HiWrite(word), endLine)
}

func (b *Bash) ColorAll(line string) string {
	return fmt.Sprintf("%v", b.HiRed(line))
}
