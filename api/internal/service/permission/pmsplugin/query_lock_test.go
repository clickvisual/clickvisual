package pmsplugin

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestQueryPermissionLockCancellation(t *testing.T) {
	enforcerLock.Lock()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	_, err := EnforceOneInManyContext(ctx)
	enforcerLock.Unlock()
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("lock wait did not cancel: %v", err)
	}
	next, cancelNext := context.WithTimeout(context.Background(), time.Second)
	defer cancelNext()
	if err = lockEnforcerContext(next); err != nil {
		t.Fatalf("lock unavailable after cancellation: %v", err)
	}
	enforcerLock.Unlock()
}
