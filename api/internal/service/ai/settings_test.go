package ai

import "testing"

func TestMaskAPIKey(t *testing.T) {
	if got := maskAPIKey(""); got != "" {
		t.Fatalf("expected empty mask, got %q", got)
	}
	if got := maskAPIKey("encrypted"); got != "已配置" {
		t.Fatalf("expected masked marker, got %q", got)
	}
}

func TestBoolToInt(t *testing.T) {
	if got := boolToInt(true); got != 1 {
		t.Fatalf("expected 1, got %d", got)
	}
	if got := boolToInt(false); got != 0 {
		t.Fatalf("expected 0, got %d", got)
	}
}
