package source

import "testing"

func TestQuoteSourceIdentifier(t *testing.T) {
	got, err := quoteSourceIdentifier("dev_log")
	if err != nil {
		t.Fatalf("quoteSourceIdentifier returned error: %v", err)
	}
	if got != "`dev_log`" {
		t.Fatalf("quoteSourceIdentifier = %q, want %q", got, "`dev_log`")
	}
}

func TestQuoteSourceIdentifierRejectsUnsafeInput(t *testing.T) {
	if _, err := quoteSourceIdentifier("dev_log; DROP TABLE t"); err == nil {
		t.Fatal("expected unsafe identifier to be rejected")
	}
}
