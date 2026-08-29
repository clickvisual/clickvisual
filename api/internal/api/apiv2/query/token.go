package query

import (
	"fmt"
	"time"

	"github.com/spf13/cast"

	"github.com/clickvisual/clickvisual/api/internal/pkg/component/core"
	dbmodel "github.com/clickvisual/clickvisual/api/internal/pkg/model/db"
	view "github.com/clickvisual/clickvisual/api/internal/pkg/model/view"
	"github.com/clickvisual/clickvisual/api/internal/service"
	"github.com/clickvisual/clickvisual/api/internal/service/permission"
	"github.com/clickvisual/clickvisual/api/internal/service/querytoken"
)

const maxTokenQueryPageSize uint32 = 500

func TokenList(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	resp, err := querytoken.List()
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func TokenCreate(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	var req view.ReqQueryTokenCreate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := querytoken.Create(req, c.Uid())
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func TokenUpdate(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	id := cast.ToInt(c.Param("token-id"))
	var req view.ReqQueryTokenUpdate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	resp, err := querytoken.Update(id, req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK(resp)
}

func TokenGrantUpdate(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	id := cast.ToInt(c.Param("token-id"))
	var req view.ReqQueryTokenGrantUpdate
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	if err := querytoken.ReplaceGrants(id, req.TableIDs); err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONOK()
}

func TokenAuditList(c *core.Context) {
	if err := permission.Manager.IsRootUser(c.Uid()); err != nil {
		c.JSONE(1, "permission verification failed", err)
		return
	}
	req := view.ReqQueryTokenAuditList{
		TokenID:  cast.ToInt(c.Query("tokenId")),
		Current:  cast.ToInt(c.DefaultQuery("current", "1")),
		PageSize: cast.ToInt(c.DefaultQuery("pageSize", "20")),
	}
	if req.TokenID == 0 {
		req.TokenID = cast.ToInt(c.Param("token-id"))
	}
	total, resp, err := querytoken.ListAudits(req)
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	c.JSONPage(resp, core.Pagination{Current: req.Current, PageSize: req.PageSize, Total: total})
}

func TokenRun(c *core.Context) {
	startedAt := time.Now()
	var req view.QueryRequestV2
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	principal, err := querytoken.Validate(querytoken.ExtractBearerToken(
		c.GetHeader("Authorization"),
		c.GetHeader("X-ClickVisual-Query-Token"),
	))
	if err != nil {
		c.JSONE(1, err.Error(), nil)
		return
	}
	ctx, tableInfo, err := buildRunContext(req.Tid)
	if err != nil {
		recordTokenAudit(c, principal, tableInfo, req, 0, time.Since(startedAt).Milliseconds(), querytoken.AuditStatusFailed, err)
		c.JSONE(1, err.Error(), nil)
		return
	}
	if req.PageSize > maxTokenQueryPageSize {
		err = fmt.Errorf("pageSize must be <= %d", maxTokenQueryPageSize)
		recordTokenAudit(c, principal, tableInfo, req, 0, time.Since(startedAt).Milliseconds(), querytoken.AuditStatusFailed, err)
		c.JSONE(1, err.Error(), nil)
		return
	}
	allowed, err := querytoken.HasTablePermission(principal.Token.ID, tableInfo.ID)
	if err != nil {
		recordTokenAudit(c, principal, tableInfo, req, 0, time.Since(startedAt).Milliseconds(), querytoken.AuditStatusFailed, err)
		c.JSONE(1, err.Error(), nil)
		return
	}
	if !allowed {
		err = fmt.Errorf("token has no permission for table %d", tableInfo.ID)
		recordTokenAudit(c, principal, tableInfo, req, 0, time.Since(startedAt).Milliseconds(), querytoken.AuditStatusFailed, err)
		c.JSONE(1, "permission verification failed", err)
		return
	}
	op, err := service.InstanceManager.Load(tableInfo.Database.Iid)
	if err != nil {
		recordTokenAudit(c, principal, tableInfo, req, 0, time.Since(startedAt).Milliseconds(), querytoken.AuditStatusFailed, err)
		c.JSONE(core.CodeErr, "clickhouse i/o timeout", err)
		return
	}
	result, err := runStructuredQueryWithFallback(c.Request.Context(), op, req, ctx)
	costMs := time.Since(startedAt).Milliseconds()
	if err != nil {
		if isRequestCanceled(err) {
			return
		}
		recordTokenAudit(c, principal, tableInfo, req, 0, costMs, querytoken.AuditStatusFailed, err)
		c.JSONE(core.CodeErr, err.Error(), err)
		return
	}
	querytoken.Touch(principal.Token.ID)
	recordTokenAudit(c, principal, tableInfo, req, result.Count, costMs, querytoken.AuditStatusSuccess, nil)
	c.JSONOK(RunResponse{
		Count: result.Count,
		Cost:  costMs,
		Keys:  buildQueryLogFields(result.Logs),
		Logs:  result.Logs,
		Query: result.SQL,
		SQL:   result.SQL,
		Plan:  result.Plan,
	})
}

func recordTokenAudit(c *core.Context, principal querytoken.Principal, tableInfo dbmodel.BaseTable, req view.QueryRequestV2, count uint64, costMs int64, status string, err error) {
	errorMessage := ""
	if err != nil {
		errorMessage = err.Error()
	}
	querytoken.RecordAudit(querytoken.AuditInput{
		Token:        principal.Token,
		Table:        tableInfo,
		Request:      req,
		ResultCount:  count,
		CostMs:       costMs,
		Status:       status,
		ErrorMessage: errorMessage,
		ClientIP:     c.ClientIP(),
		UserAgent:    c.Request.UserAgent(),
	})
}
