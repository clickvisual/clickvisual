package service

import (
	"bytes"
	"crypto/rand"
	"encoding/gob"
	"io"

	"github.com/shimohq/mogo/api/pkg/model/db"

	"github.com/unknwon/com"
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

func EncodeGob(obj map[interface{}]interface{}) ([]byte, error) {
	buf := bytes.NewBuffer(nil)
	err := gob.NewEncoder(buf).Encode(obj)
	return buf.Bytes(), err
}

func DecodeGob(encoded []byte) (out map[interface{}]interface{}, err error) {
	buf := bytes.NewBuffer(encoded)
	err = gob.NewDecoder(buf).Decode(&out)
	return out, err
}

// NOTE: A local copy in case of underlying package change
var alphanum = []byte("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")

// generateRandomKey creates a random key with the given strength.
func generateRandomKey(strength int) []byte {
	k := make([]byte, strength)
	if n, err := io.ReadFull(rand.Reader, k); n != strength || err != nil {
		return com.RandomCreateBytes(strength, alphanum...)
	}
	return k
}
