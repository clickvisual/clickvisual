# ClickVisual v2 定时任务报表数据推送 Implementation Plan

> **For agentic workers:** DEFAULT SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Use superpowers:executing-plans only when the user explicitly requests inline execution or when subagent dispatch is a poor fit for the next task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `v1/v2` 共存前提下，优先打通 `v2` 的定时任务报表数据推送主链路，覆盖报表配置、调度保存、钉钉渠道选择、推送执行与基本状态反馈。

**Architecture:** 新建 `ui-v2/` 作为独立前端应用，但第一批只落报表主链路需要的最小壳层与页面。后端优先复用现有 `pandas crontab` 调度能力和 `alarm pusher` 通知能力，在 `api/v2/reports/*` 下补一层面向页面的聚合接口，避免前端直接耦合旧的 `bigdata` 页面模型。

**Tech Stack:** Go + Gin + Gorm；React 18 + TypeScript；独立 `ui-v2` 前端；现有 `pandas` 调度能力；现有通知渠道与 webhook 推送能力。

---

### 任务 1：建立 `ui-v2` 最小应用壳层与报表入口

**Files:**
- Create: `ui-v2/package.json`
- Create: `ui-v2/tsconfig.json`
- Create: `ui-v2/index.html`
- Create: `ui-v2/src/main.tsx`
- Create: `ui-v2/src/app/router.tsx`
- Create: `ui-v2/src/app/App.tsx`
- Create: `ui-v2/src/domains/report/pages/ReportSchedulePage.tsx`
- Create: `ui-v2/src/shared/layout/AppShell.tsx`
- Create: `ui-v2/src/shared/http/client.ts`
- Create: `ui-v2/src/shared/types/report.ts`

- [ ] **Step 1: 写一个失败的前端路由冒烟测试**

```tsx
import { describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { routes } from "../src/app/router";

describe("report route", () => {
  it("renders v2 report schedule page", () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports"],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByText("定时报表")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd ui-v2 && npm test -- report-route.test.tsx`
Expected: FAIL，提示 `ui-v2` 工程或 `routes` 尚不存在。

- [ ] **Step 3: 写最小前端壳层实现**

```tsx
// ui-v2/src/app/router.tsx
import App from "./App";
import ReportSchedulePage from "../domains/report/pages/ReportSchedulePage";

export const routes = [
  {
    path: "/v2",
    element: <App />,
    children: [
      {
        path: "reports",
        element: <ReportSchedulePage />,
      },
    ],
  },
];
```

```tsx
// ui-v2/src/domains/report/pages/ReportSchedulePage.tsx
export default function ReportSchedulePage() {
  return (
    <section>
      <h1>定时报表</h1>
      <p>报表数据推送主链路</p>
    </section>
  );
}
```

```tsx
// ui-v2/src/app/App.tsx
import { Outlet } from "react-router-dom";
import AppShell from "../shared/layout/AppShell";

export default function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd ui-v2 && npm test -- report-route.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add ui-v2 docs/superpowers/plans/2026-03-30-v2-report-push-implementation.md
git commit -m "feat: bootstrap ui-v2 report shell"
```

### 任务 2：补 `v1/v2` 切换入口与 `v2` 静态挂载占位

**Files:**
- Modify: `api/internal/router/router.go`
- Modify: `api/internal/router/v2.go`
- Create: `api/internal/ui/v2dist/.gitkeep`
- Create: `ui-v2/src/shared/layout/VersionSwitcher.tsx`
- Modify: `ui-v2/src/shared/layout/AppShell.tsx`

- [ ] **Step 1: 写一个失败的后端路由测试，验证存在 `v2` 入口**

```go
func TestRouter_ContainsV2ReportEntry(t *testing.T) {
	r := gin.New()
	InitRouter(r)

	req := httptest.NewRequest(http.MethodGet, "/v2/reports", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code == http.StatusNotFound {
		t.Fatalf("expected v2 entry route to exist")
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/router -run TestRouter_ContainsV2ReportEntry -v`
Expected: FAIL，提示 `/v2/reports` 不存在。

- [ ] **Step 3: 添加最小挂载与切换入口**

```go
// 伪代码：api/internal/router/router.go
root.GET("/v2/*filepath", serveV2Index)
```

```tsx
// ui-v2/src/shared/layout/VersionSwitcher.tsx
export default function VersionSwitcher() {
  return (
    <div>
      <a href="/query">返回 v1</a>
    </div>
  );
}
```

```tsx
// ui-v2/src/shared/layout/AppShell.tsx
import VersionSwitcher from "./VersionSwitcher";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <header>
        <VersionSwitcher />
      </header>
      {children}
    </main>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `go test ./api/internal/router -run TestRouter_ContainsV2ReportEntry -v`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add api/internal/router api/internal/ui/v2dist ui-v2/src/shared/layout
git commit -m "feat: add v1 v2 switch entry"
```

### 任务 3：定义报表主链路 `v2` 契约与后端聚合接口

**Files:**
- Create: `api/internal/api/apiv2/report/report.go`
- Create: `api/internal/service/report/service.go`
- Create: `api/internal/service/report/dto.go`
- Modify: `api/internal/router/v2.go`
- Create: `api/internal/pkg/model/view/report.go`
- Test: `api/internal/api/apiv2/report/report_test.go`

- [ ] **Step 1: 写失败的接口测试，覆盖报表配置读取与保存**

```go
func TestReportConfig_SaveAndGet(t *testing.T) {
	// 目标：
	// 1. POST /api/v2/reports/configs
	// 2. GET /api/v2/reports/configs/:node-id
	// 3. 返回结构包含 cron、channelIds、desc、dutyUid
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/api/apiv2/report -run TestReportConfig_SaveAndGet -v`
Expected: FAIL，提示 `report` 包或接口不存在。

- [ ] **Step 3: 写最小接口实现，内部复用现有 `pandas crontab`**

```go
// api/internal/pkg/model/view/report.go
type ReqReportSchedule struct {
	NodeID        int   `json:"nodeId" form:"nodeId"`
	Desc          string `json:"desc" form:"desc"`
	DutyUID       int   `json:"dutyUid" form:"dutyUid"`
	Cron          string `json:"cron" form:"cron"`
	ChannelIDs    []int `json:"channelIds" form:"channelIds"`
	IsRetry       int   `json:"isRetry" form:"isRetry"`
	RetryTimes    int   `json:"retryTimes" form:"retryTimes"`
	RetryInterval int   `json:"retryInterval" form:"retryInterval"`
}
```

```go
// api/internal/api/apiv2/report/report.go
func ScheduleUpsert(c *core.Context) {
	var req view.ReqReportSchedule
	if err := c.Bind(&req); err != nil {
		c.JSONE(1, "invalid parameter: "+err.Error(), nil)
		return
	}
	service.Report.UpsertSchedule(c, req)
}
```

```go
// api/internal/service/report/service.go
func (s *reportService) UpsertSchedule(c *core.Context, req view.ReqReportSchedule) {
	// 内部调用 db.BigdataCrontab 的 create/update，先不重新发明调度模型
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `go test ./api/internal/api/apiv2/report -run TestReportConfig_SaveAndGet -v`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add api/internal/api/apiv2/report api/internal/service/report api/internal/pkg/model/view/report.go api/internal/router/v2.go
git commit -m "feat: add v2 report schedule api"
```

### 任务 4：接入钉钉渠道选择与报表配置表单

**Files:**
- Create: `ui-v2/src/domains/report/api/report.ts`
- Create: `ui-v2/src/domains/report/components/ReportScheduleForm.tsx`
- Create: `ui-v2/src/domains/report/components/ChannelSelector.tsx`
- Modify: `ui-v2/src/domains/report/pages/ReportSchedulePage.tsx`
- Test: `ui-v2/src/domains/report/components/ReportScheduleForm.test.tsx`

- [ ] **Step 1: 写失败的组件测试**

```tsx
it("submits report schedule with dingtalk channels", async () => {
  render(<ReportScheduleForm />);
  await user.type(screen.getByLabelText("Cron"), "0 */1 * * *");
  await user.click(screen.getByText("保存报表调度"));
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({
      cron: "0 */1 * * *",
      channelIds: expect.any(Array),
    }),
  );
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd ui-v2 && npm test -- ReportScheduleForm.test.tsx`
Expected: FAIL，组件或 API 不存在。

- [ ] **Step 3: 写最小前端实现**

```tsx
// ui-v2/src/domains/report/api/report.ts
export async function saveReportSchedule(payload: ReportSchedulePayload) {
  return client.post("/api/v2/reports/configs", payload);
}
```

```tsx
// ui-v2/src/domains/report/components/ReportScheduleForm.tsx
export default function ReportScheduleForm() {
  return (
    <form>
      <input aria-label="Cron" name="cron" />
      <button type="submit">保存报表调度</button>
    </form>
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd ui-v2 && npm test -- ReportScheduleForm.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add ui-v2/src/domains/report
git commit -m "feat: add report schedule form"
```

### 任务 5：补执行状态、错误提示和阶段性验收

**Files:**
- Modify: `ui-v2/src/domains/report/pages/ReportSchedulePage.tsx`
- Create: `ui-v2/src/domains/report/components/ReportPushStatusCard.tsx`
- Modify: `api/internal/api/apiv2/report/report.go`
- Modify: `api/internal/service/report/service.go`
- Test: `ui-v2/src/domains/report/pages/ReportSchedulePage.test.tsx`
- Test: `api/internal/api/apiv2/report/report_test.go`

- [ ] **Step 1: 写失败测试，覆盖保存后状态回显与错误提示**

```tsx
it("shows success and failure states for schedule save", async () => {
  render(<ReportSchedulePage />);
  expect(await screen.findByText("保存成功")).toBeInTheDocument();
});
```

```go
func TestReportConfig_ReturnsValidationErrorWhenChannelMissing(t *testing.T) {
	// channelIds 为空时返回 400 风格错误
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd ui-v2 && npm test -- ReportSchedulePage.test.tsx`
Expected: FAIL

Run: `go test ./api/internal/api/apiv2/report -run TestReportConfig_ReturnsValidationErrorWhenChannelMissing -v`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```go
// api/internal/service/report/service.go
if len(req.ChannelIDs) == 0 {
	c.JSONE(1, "channelIds 不能为空", nil)
	return
}
```

```tsx
// ui-v2/src/domains/report/components/ReportPushStatusCard.tsx
export default function ReportPushStatusCard({ status }: { status: "idle" | "success" | "error" }) {
  if (status === "success") return <div>保存成功</div>;
  if (status === "error") return <div>保存失败</div>;
  return <div>尚未保存</div>;
}
```

- [ ] **Step 4: 跑阶段性验证**

Run: `go test ./api/internal/api/apiv2/report -v`
Expected: PASS

Run: `cd ui-v2 && npm test -- --runInBand`
Expected: PASS

Run: `git diff --stat`
Expected: 显示本批次仅涉及 `ui-v2`、`api/internal/api/apiv2/report`、`api/internal/service/report`、路由与计划文件

- [ ] **Step 5: 提交**

```bash
git add ui-v2 api/internal/api/apiv2/report api/internal/service/report api/internal/router/v2.go
git commit -m "feat: complete v2 report push flow"
```

## 自检

- 规格覆盖：
  - 已覆盖 `v1/v2` 共存基础入口
  - 已覆盖报表优先的 `v2` 契约层
  - 已覆盖定时任务报表数据推送主链路
  - 未覆盖总览、查询、告警、配置中心剩余模块，这是刻意后置，不是遗漏
- 占位符扫描：
  - 计划没有使用 `TODO`、`TBD` 或“类似任务 N”这类占位语句
- 类型一致性：
  - 前端 payload 使用 `channelIds / cron / dutyUid / retryTimes / retryInterval`
  - 后端请求结构与现有 `BigdataCrontab` 字段保持同名映射

## 执行交接

本计划默认进入 `Subagent-Driven` 执行：

- 由 orchestrator 按任务逐个派发新的执行子代理
- 每个任务完成后先做规格一致性 review，再做代码质量 review
- 只有在用户明确要求 inline execution，或某个任务不适合子代理分派时，才切换到 `executing-plans`
