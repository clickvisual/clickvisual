package pusher

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
)

type requestContext struct {
	ctx         context.Context
	channelType int
}

func (p *requestContext) setContext(ctx context.Context, channelType int) {
	p.ctx = ctx
	p.channelType = channelType
}

func (p *requestContext) httpClient() *http.Client {
	if p.ctx == nil {
		return http.DefaultClient
	}
	return &http.Client{Timeout: 15 * time.Second, Transport: contextTransport{ctx: p.ctx, channelType: p.channelType}}
}

type contextTransport struct {
	ctx         context.Context
	channelType int
}

func (t contextTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	response, err := http.DefaultTransport.RoundTrip(req.Clone(t.ctx))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		response.Body.Close()
		return nil, fmt.Errorf("channel returned HTTP %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 65537))
	response.Body.Close()
	if err != nil {
		return nil, err
	}
	if len(body) > 65536 {
		return nil, fmt.Errorf("channel response too large")
	}
	var ack struct {
		ErrCode    int   `json:"errcode"`
		Code       int   `json:"code"`
		StatusCode int   `json:"StatusCode"`
		OK         *bool `json:"ok"`
	}
	if json.Unmarshal(body, &ack) == nil {
		rejected := false
		switch t.channelType {
		case db.ChannelDingDing, db.ChannelWeChat:
			rejected = ack.ErrCode != 0
		case db.ChannelFeiShu:
			rejected = ack.Code != 0 || ack.StatusCode != 0
		case db.ChannelTelegram:
			rejected = ack.OK != nil && !*ack.OK
		}
		if rejected {
			return nil, fmt.Errorf("channel rejected notification")
		}
	}
	response.Body = io.NopCloser(bytes.NewReader(body))
	return response, nil
}

// SendContext uses the existing channel sender with a bounded, cancellable transport.
func SendContext(ctx context.Context, channel *db.AlarmChannel, msg *db.PushMsg) error {
	sender, err := GetPusher(channel.Typ)
	if err != nil {
		return err
	}
	sender.(interface{ setContext(context.Context, int) }).setContext(ctx, channel.Typ)
	return sender.Send(channel, msg)
}
