package troubleshoot

import (
	"strconv"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	tsvc "github.com/clickvisual/clickvisual/api/internal/service/troubleshoot"
)

type textRequest struct {
	Text string `json:"text"`
}

type confirmRequest struct {
	Accept bool `json:"accept"`
}

func List(c *core.Context) {
	rows, err := tsvc.ListSessions(c.Uid())
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(rows)
}

func Create(c *core.Context) {
	var req textRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	session, err := tsvc.Start(c.Request.Context(), c.Uid(), req.Text)
	writeSession(c, session, err)
}

func Get(c *core.Context) {
	id, ok := sessionID(c)
	if !ok {
		return
	}
	session, err := tsvc.GetSession(c.Uid(), id)
	writeSession(c, session, err)
}

func Reply(c *core.Context) {
	id, ok := sessionID(c)
	if !ok {
		return
	}
	var req textRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	session, err := tsvc.Reply(c.Request.Context(), c.Uid(), id, req.Text)
	writeSession(c, session, err)
}

func Confirm(c *core.Context) {
	id, ok := sessionID(c)
	if !ok {
		return
	}
	var req confirmRequest
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	session, err := tsvc.Confirm(c.Request.Context(), c.Uid(), id, req.Accept)
	writeSession(c, session, err)
}

func Share(c *core.Context) {
	id, ok := sessionID(c)
	if !ok {
		return
	}
	token, err := tsvc.Share(c.Uid(), id)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(map[string]string{"token": token})
}

func Shared(c *core.Context) {
	session, err := tsvc.GetShared(c.Request.Context(), c.Uid(), c.Param("token"))
	writeSession(c, session, err)
}

func sessionID(c *core.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("session-id"))
	if err != nil || id <= 0 {
		c.JSONE(1, "invalid parameter", nil)
		return 0, false
	}
	return id, true
}

func writeSession(c *core.Context, session any, err error) {
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(session)
}
