package db

import (
	"strings"
	"testing"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func TestUserInfoXReturnsErrorWhenMetadataDBMissing(t *testing.T) {
	previous := invoker.Db
	invoker.Db = nil
	t.Cleanup(func() {
		invoker.Db = previous
	})

	_, err := UserInfoX(map[string]interface{}{"username": "clickvisual"})
	if err == nil {
		t.Fatal("expected error when metadata database is not attached")
	}
	if !strings.Contains(err.Error(), "metadata database is not attached") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestUserListReturnsErrorWhenMetadataDBMissing(t *testing.T) {
	previous := invoker.Db
	invoker.Db = nil
	t.Cleanup(func() {
		invoker.Db = previous
	})

	_, err := UserList(map[string]interface{}{})
	if err == nil {
		t.Fatal("expected error when metadata database is not attached")
	}
	if !strings.Contains(err.Error(), "metadata database is not attached") {
		t.Fatalf("unexpected error: %v", err)
	}
}
