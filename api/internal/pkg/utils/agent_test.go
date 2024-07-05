package utils

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_getFilterK8SContainerdWrapLog(t *testing.T) {
	logs := GetFilterK8SContainerdWrapLog(`7T10:34:41.033134359+08:00 stderr F {"level":20,"time":"2023-10-17T02:34:41.032Z","pid":1,"hostname":"svc-nodejs-sheet-calc-local-queue-78d864ccc6-f229x","category":"rollout","image_tag":"unknown","env":"production","application":"svc-sheet-calc","message":"rollout keep redis alive starting...","file":"b.s.d.u.feature","requestId":"e20f0709-6b5c-415b-894c-a132e015be53"}`)
	assert.Equal(t, `{"level":20,"time":"2023-10-17T02:34:41.032Z","pid":1,"hostname":"svc-nodejs-sheet-calc-local-queue-78d864ccc6-f229x","category":"rollout","image_tag":"unknown","env":"production","application":"svc-sheet-calc","message":"rollout keep redis alive starting...","file":"b.s.d.u.feature","requestId":"e20f0709-6b5c-415b-894c-a132e015be53"}`, logs)
}

func Test_Index(t *testing.T) {
	str, pos := Index(`"ts":"2023-08-23 23:22:12" 12345`, `"ts":"`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	fmt.Printf("pos--------------->"+"%+v\n", pos)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_MidIndex(t *testing.T) {
	str, pos := Index(`"lv":"info","ts":"2023-08-23 23:22:12" 12345`, `"ts":"`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	fmt.Printf("pos--------------->"+"%+v\n", pos)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}

func Test_getValue(t *testing.T) {
	str := getValue(`2023-08-23 23:22:12" 12345`)
	fmt.Printf("str--------------->"+"%+v\n", str)
	assert.Equal(t, "2023-08-23 23:22:12", str)
}
func TestTimeParse(t *testing.T) {
	t0 := TimeParse("1720145941")
	assert.Equal(t, 1720145941, int(t0.Unix()))
}

func TestTimeParse2(t *testing.T) {
	t0 := TimeParse("1720145941.9131143")
	assert.Equal(t, 1720145941, int(t0.Unix()))
}
