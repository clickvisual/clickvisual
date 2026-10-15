package pusher

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

func TestSendContextCancelsHTTPChannels(t *testing.T) {
	for _, typ := range []int{db.ChannelDingDing, db.ChannelWeChat, db.ChannelFeiShu, db.ChannelSlack, db.ChannelWebHook} {
		t.Run(string(rune('0'+typ)), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				select {
				case <-r.Context().Done():
				case <-time.After(time.Second):
				}
			}))
			defer server.Close()
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
			defer cancel()
			start := time.Now()
			if err := SendContext(ctx, &db.AlarmChannel{Typ: typ, Key: server.URL}, &db.PushMsg{Title: "Analysis", Text: "Conclusion"}); err == nil {
				t.Fatal("cancelled send returned success")
			}
			if time.Since(start) > 500*time.Millisecond {
				t.Fatal("send ignored context")
			}
		})
	}
}

func TestSendContextRejectsHTTPFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusServiceUnavailable) }))
	defer server.Close()
	if err := SendContext(context.Background(), &db.AlarmChannel{Typ: db.ChannelDingDing, Key: server.URL}, &db.PushMsg{Text: "Conclusion"}); err == nil {
		t.Fatal("HTTP failure confirmed as delivered")
	}
}

func TestSendContextRejectsVendorFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"errcode":40001,"errmsg":"invalid credential"}`))
	}))
	defer server.Close()
	if err := SendContext(context.Background(), &db.AlarmChannel{Typ: db.ChannelDingDing, Key: server.URL}, &db.PushMsg{Text: "Conclusion"}); err == nil {
		t.Fatal("vendor failure confirmed as delivered")
	}
}

func TestSendContextAcceptsGenericWebhookCode200(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":200}`))
	}))
	defer server.Close()
	if err := SendContext(context.Background(), &db.AlarmChannel{Typ: db.ChannelWebHook, Key: server.URL}, &db.PushMsg{Text: "Conclusion"}); err != nil {
		t.Fatalf("generic webhook success rejected: %v", err)
	}
}
