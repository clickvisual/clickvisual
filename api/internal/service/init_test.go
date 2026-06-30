package service

import (
	"errors"
	"runtime/debug"
	"testing"

	"github.com/ego-component/egorm"
	"github.com/gotomicro/ego/core/econf"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
)

func TestInitWithoutMetadataDBDoesNotPanic(t *testing.T) {
	econf.Reset()
	econf.Set("app.isMultiCopy", false)
	econf.Set("app.permissionFile", "../../../config/resource.yaml")
	econf.Set("app.rootURL", "http://localhost:19001")
	invoker.Db = nil

	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("Init() panicked without metadata DB: %v\n%s", r, debug.Stack())
		}
		_ = Close()
	}()

	if err := Init(); err != nil {
		t.Fatalf("Init() error = %v", err)
	}
}

func TestAttachMetadataDBOnceStartsDBBackedServicesAfterAttach(t *testing.T) {
	invoker.Db = nil
	started := 0
	oldAttach := tryAttachMetadataDB
	oldStart := startDBBackedServices
	tryAttachMetadataDB = func() error {
		invoker.Db = &egorm.Component{}
		return nil
	}
	startDBBackedServices = func() error {
		started++
		return nil
	}
	defer func() {
		tryAttachMetadataDB = oldAttach
		startDBBackedServices = oldStart
		invoker.Db = nil
		dbBackedStarted = false
	}()

	if err := attachMetadataDBOnce(); err != nil {
		t.Fatalf("attachMetadataDBOnce() error = %v", err)
	}
	if err := attachMetadataDBOnce(); err != nil {
		t.Fatalf("attachMetadataDBOnce() second error = %v", err)
	}
	if started != 1 {
		t.Fatalf("db-backed services started %d times, want 1", started)
	}
}

func TestAttachMetadataDBOnceDoesNotStartWhenAttachFails(t *testing.T) {
	invoker.Db = nil
	started := 0
	oldAttach := tryAttachMetadataDB
	oldStart := startDBBackedServices
	tryAttachMetadataDB = func() error {
		return errors.New("not ready")
	}
	startDBBackedServices = func() error {
		started++
		return nil
	}
	defer func() {
		tryAttachMetadataDB = oldAttach
		startDBBackedServices = oldStart
		dbBackedStarted = false
	}()

	if err := attachMetadataDBOnce(); err == nil {
		t.Fatal("attachMetadataDBOnce() error = nil, want attach error")
	}
	if started != 0 {
		t.Fatalf("db-backed services started %d times, want 0", started)
	}
}
