package service

import (
	"context"
	"errors"
	"strconv"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"github.com/clickvisual/clickvisual/api/internal/invoker"
	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestAIObserverSeesSuppressedNotificationsAndFailureDoesNotBlock(t *testing.T) {
	d, err := gorm.Open(sqlite.Open("file:alertmanager-ai?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	oldDB := invoker.Db
	invoker.Db = d
	t.Cleanup(func() { invoker.Db = oldDB; SetAlertObserver(nil) })
	if err := d.AutoMigrate(&db.Alarm{}, &db.AlarmFilter{}, &db.AlarmHistory{}); err != nil {
		t.Fatal(err)
	}
	a := db.Alarm{Uuid: "observer", Status: db.AlarmStatusFiring, IsDisableResolve: 1}
	if err := d.Create(&a).Error; err != nil {
		t.Fatal(err)
	}
	f := db.AlarmFilter{AlarmId: a.ID, Status: db.AlarmStatusFiring}
	if err := d.Create(&f).Error; err != nil {
		t.Fatal(err)
	}
	var statuses []string
	SetAlertObserver(func(_ context.Context, _ db.Alarm, _ int, n db.Notification) error {
		statuses = append(statuses, n.Status)
		return errors.New("optional queue unavailable")
	})
	handler := &alert{}
	for _, status := range []string{"resolved", "firing"} {
		if err := handler.HandlerAlertManager(a.Uuid, strconv.Itoa(f.ID), db.Notification{Status: status}); err != nil {
			t.Fatalf("normal alert failed: %v", err)
		}
	}
	if len(statuses) != 2 || statuses[0] != "resolved" || statuses[1] != "firing" {
		t.Fatalf("observed %v", statuses)
	}
	var histories int64
	d.Model(&db.AlarmHistory{}).Count(&histories)
	if histories != 1 {
		t.Fatalf("normal history changed: %d", histories)
	}
}
