package service

import (
	"encoding/gob"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func initGob() {
	gob.Register([]interface{}{})
	gob.Register(map[int]interface{}{})
	gob.Register(map[string]interface{}{})
	gob.Register(map[interface{}]interface{}{})
	gob.Register(map[string]string{})
	gob.Register(map[int]string{})
	gob.Register(map[int]int{})
	gob.Register(map[int]int64{})
	gob.Register(&db.User{})
}
