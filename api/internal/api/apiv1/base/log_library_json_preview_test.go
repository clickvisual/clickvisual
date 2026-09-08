package base

import "testing"

func TestInferLogLibraryJSON(t *testing.T) {
	preview, err := inferLogLibraryJSON(`{"timestamp":1710000000,"message":"hello","labels":{"service":"api"}}`, "")
	if err != nil {
		t.Fatal(err)
	}
	if preview.Mode != "standalone" || preview.TableCount != 3 {
		t.Fatalf("unexpected standalone mode: %#v", preview)
	}
	if preview.TimeField != "timestamp" || preview.TimeFieldType != 2 {
		t.Fatalf("unexpected time field: %#v", preview)
	}
	if preview.RawLogField != "message" {
		t.Fatalf("unexpected raw log field: %#v", preview)
	}
	if len(preview.Fields) != 4 {
		t.Fatalf("unexpected fields: %#v", preview.Fields)
	}
}

func TestInferLogLibraryJSONCluster(t *testing.T) {
	preview, err := inferLogLibraryJSON(`{"time":"2024-01-01T00:00:00Z","log":"ok"}`, "cluster_a")
	if err != nil {
		t.Fatal(err)
	}
	if preview.Mode != "cluster" || preview.TableCount != 4 {
		t.Fatalf("unexpected cluster mode: %#v", preview)
	}
}

func TestInferLogLibraryJSONStringTime(t *testing.T) {
	preview, err := inferLogLibraryJSON(`{"created_at":"2026-09-03T19:00:00Z","message":"hello","status":"ok"}`, "")
	if err != nil {
		t.Fatal(err)
	}
	if preview.TimeField != "created_at" || preview.TimeFieldType != 1 {
		t.Fatalf("unexpected string time field: %#v", preview)
	}
	if len(preview.TimeCandidates) != 1 {
		t.Fatalf("unexpected string time candidates: %#v", preview.TimeCandidates)
	}
}

func TestInferLogLibraryJSONRejectsNonObject(t *testing.T) {
	if _, err := inferLogLibraryJSON(`[1,2]`, ""); err == nil {
		t.Fatal("expected non-object JSON to be rejected")
	}
}
