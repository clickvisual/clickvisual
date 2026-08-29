package shorturl

import (
	"net/url"
	"testing"
)

func TestNormalizeOriginURLAddsTableIDForDatabaseTableShare(t *testing.T) {
	got, err := normalizeOriginURL(
		"http://172.17.9.83/mdp/clickvisual/share/?start=1785138360&end=1785139260&database=logger&table=app_stdout",
		func(values url.Values) int {
			if values.Get("database") != "logger" || values.Get("table") != "app_stdout" {
				t.Fatalf("unexpected table scope: %s.%s", values.Get("database"), values.Get("table"))
			}
			return 9527
		},
	)
	if err != nil {
		t.Fatalf("normalizeOriginURL error: %v", err)
	}

	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("parse normalized URL error: %v", err)
	}
	values := parsed.Query()
	if values.Get("start") != "1785138360" {
		t.Fatalf("start was not preserved: %q", values.Get("start"))
	}
	if values.Get("end") != "1785139260" {
		t.Fatalf("end was not preserved: %q", values.Get("end"))
	}
	if values.Get("tid") != "9527" {
		t.Fatalf("tid was not resolved: %q", values.Get("tid"))
	}
	if values.Get("tab") != "custom" {
		t.Fatalf("tab was not normalized: %q", values.Get("tab"))
	}
}

func TestNormalizeOriginURLAddsLegacyShareParamsForV2Share(t *testing.T) {
	got, err := normalizeOriginURL(
		"http://localhost/share?database=logger&table=app_stdout&startTime=2026-07-24T11:33&endTime=2026-07-24T11:48&query=%60lv%60+%3D+%27error%27",
		func(url.Values) int {
			return 9527
		},
	)
	if err != nil {
		t.Fatalf("normalizeOriginURL error: %v", err)
	}

	values, err := url.ParseQuery(mustParseURL(t, got).RawQuery)
	if err != nil {
		t.Fatalf("parse query error: %v", err)
	}
	if values.Get("start") == "" || values.Get("end") == "" {
		t.Fatalf("start/end were not derived: %q %q", values.Get("start"), values.Get("end"))
	}
	if values.Get("startTime") != "" || values.Get("endTime") != "" {
		t.Fatalf("startTime/endTime should be removed after normalization: %q %q", values.Get("startTime"), values.Get("endTime"))
	}
	if values.Get("kw") != "`lv` = 'error'" {
		t.Fatalf("kw was not derived from query: %q", values.Get("kw"))
	}
	if values.Get("query") != "`lv` = 'error'" {
		t.Fatalf("query was not preserved: %q", values.Get("query"))
	}
}

func TestNormalizeOriginURLDoesNotResolveExistingTableID(t *testing.T) {
	called := false
	got, err := normalizeOriginURL(
		"http://localhost/share?database=logger&table=app_stdout&tid=1001",
		func(url.Values) int {
			called = true
			return 9527
		},
	)
	if err != nil {
		t.Fatalf("normalizeOriginURL error: %v", err)
	}
	if called {
		t.Fatal("resolver should not be called when tid already exists")
	}
	if mustParseURL(t, got).Query().Get("tid") != "1001" {
		t.Fatalf("existing tid was not preserved: %s", got)
	}
}

func mustParseURL(t *testing.T, value string) *url.URL {
	t.Helper()
	parsed, err := url.Parse(value)
	if err != nil {
		t.Fatalf("parse URL error: %v", err)
	}
	return parsed
}
