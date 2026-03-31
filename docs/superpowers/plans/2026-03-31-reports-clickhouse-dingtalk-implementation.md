# Reports 真实 ClickHouse 定时报表与钉钉推送闭环 Implementation Plan

> **For agentic workers:** DEFAULT SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Use superpowers:executing-plans only when the user explicitly requests inline execution or when subagent dispatch is a poor fit for the next task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/api/v2/reports/*` 与 `/v2/reports` 从 demo 链路升级为真实产品闭环，覆盖独立 reports 建模、真实 ClickHouse SQL 查询、真实 scheduler、复用钉钉渠道、真实执行记录与页面读写。

**Architecture:** 继续保留现有 `api/internal/service/report` 与 `/api/v2/reports/*` 外部入口，但将其内部改造为真实 reports 领域分层：MySQL 持久化表、repository、统一执行器、真实 ClickHouse SQL runner、钉钉发送与表驱动 scheduler。前端 `/v2/reports` 保持现有产品结构，改为消费真实接口与运行态。

**Tech Stack:** Go + Gin + Gorm + MySQL；现有 ClickHouse 查询能力；现有 `cv_alarm_channel` 钉钉渠道；React 18 + TypeScript + Vitest。

---

## File Map

### 后端持久化与模型

- Create: `api/internal/pkg/model/db/report.go`
- Modify: `api/internal/pkg/model/db/interface.go`
- Modify: `config/database.sql`
- Modify: `scripts/migration/database.sql`

### reports 领域实现

- Modify: `api/internal/service/report/service.go`
- Modify: `api/internal/service/report/scheduler.go`
- Modify: `api/internal/service/report/sender.go`
- Create: `api/internal/service/report/repository.go`
- Create: `api/internal/service/report/executor.go`
- Create: `api/internal/service/report/runtime.go`
- Create: `api/internal/service/report/render.go`
- Create: `api/internal/service/report/query_runner.go`

### API 与视图模型

- Modify: `api/internal/api/apiv2/report/report.go`
- Modify: `api/internal/pkg/model/view/report.go`
- Modify: `api/internal/router/v2.go`

### 服务启动与回归测试

- Modify: `api/internal/service/init.go`
- Modify: `api/internal/api/apiv2/report/report_test.go`
- Modify: `api/internal/service/report/service_test.go`
- Create: `api/internal/service/report/repository_test.go`

### 前端对接

- Modify: `ui-v2/src/shared/types/moduleWorkspace.ts`
- Modify: `ui-v2/src/shared/mock/moduleWorkspaceApi.ts`
- Modify: `ui-v2/src/shared/http/client.ts`
- Modify: `ui-v2/src/domains/report/pages/ReportSchedulePage.tsx`
- Modify: `ui-v2/src/shared/state/useModuleWorkspace.ts`
- Modify: `ui-v2/tests/report-page.test.tsx`
- Modify: `ui-v2/tests/report-contracts.test.ts`

---

### Task 1: 建立 reports schema / migration / db model

**Files:**
- Create: `api/internal/pkg/model/db/report.go`
- Modify: `api/internal/pkg/model/db/interface.go`
- Modify: `config/database.sql`
- Modify: `scripts/migration/database.sql`
- Test: `api/internal/service/report/repository_test.go`

- [ ] **Step 1: 先写失败的 repository 表结构测试**

```go
func TestReportModels_TableName(t *testing.T) {
	assert.Equal(t, "cv_report", (&db.Report{}).TableName())
	assert.Equal(t, "cv_report_schedule", (&db.ReportSchedule{}).TableName())
	assert.Equal(t, "cv_report_execution", (&db.ReportExecution{}).TableName())
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/service/report -run TestReportModels_TableName -v`
Expected: FAIL，提示 `db.Report`、`db.ReportSchedule` 或 `db.ReportExecution` 尚不存在。

- [ ] **Step 3: 写最小 db model 与表名常量**

```go
// api/internal/pkg/model/db/interface.go
const (
	TableNameReport          = "cv_report"
	TableNameReportSchedule  = "cv_report_schedule"
	TableNameReportExecution = "cv_report_execution"
)
```

```go
// api/internal/pkg/model/db/report.go
type Report struct {
	BaseModel
	Name         string `gorm:"column:name;type:varchar(128);NOT NULL" json:"name"`
	Desc         string `gorm:"column:desc;type:varchar(255);NOT NULL" json:"desc"`
	Status       string `gorm:"column:status;type:varchar(32);NOT NULL" json:"status"`
	QueryMode    string `gorm:"column:query_mode;type:varchar(32);NOT NULL" json:"queryMode"`
	QueryText    string `gorm:"column:query_text;type:text" json:"queryText"`
	TemplateKey  string `gorm:"column:template_key;type:varchar(128);NOT NULL" json:"templateKey"`
	OutputFormat string `gorm:"column:output_format;type:varchar(32);NOT NULL" json:"outputFormat"`
	DutyUID      int    `gorm:"column:duty_uid;type:int(11)" json:"dutyUid"`
	CreatorUID   int    `gorm:"column:creator_uid;type:int(11)" json:"creatorUid"`
}

func (m *Report) TableName() string { return TableNameReport }
```

- [ ] **Step 4: 补齐 migration 语句**

```sql
CREATE TABLE IF NOT EXISTS `cv_report` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ctime` bigint DEFAULT NULL,
  `utime` bigint DEFAULT NULL,
  `dtime` bigint unsigned DEFAULT NULL,
  `name` varchar(128) NOT NULL DEFAULT '',
  `desc` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(32) NOT NULL DEFAULT 'enabled',
  `query_mode` varchar(32) NOT NULL DEFAULT 'sql',
  `query_text` text,
  `template_key` varchar(128) NOT NULL DEFAULT '',
  `output_format` varchar(32) NOT NULL DEFAULT 'markdown',
  `duty_uid` int DEFAULT NULL,
  `creator_uid` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/service/report -run TestReportModels_TableName -v`
Expected: PASS

---

### Task 2: 建立 reports repository 与基础聚合读取

**Files:**
- Create: `api/internal/service/report/repository.go`
- Create: `api/internal/service/report/repository_test.go`
- Modify: `api/internal/pkg/model/db/report.go`

- [ ] **Step 1: 写失败的 repository CRUD 测试**

```go
func TestRepository_CreateAndGetReport(t *testing.T) {
	repo := newTestRepository(t)
	reportID, err := repo.CreateReport(context.Background(), db.Report{
		Name:         "日报-核心指标概览",
		Status:       "enabled",
		QueryMode:    "sql",
		QueryText:    "SELECT 1",
		TemplateKey:  "daily-core-kpi",
		OutputFormat: "markdown",
	})
	require.NoError(t, err)

	got, err := repo.GetReport(context.Background(), reportID)
	require.NoError(t, err)
	assert.Equal(t, "日报-核心指标概览", got.Name)
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/service/report -run TestRepository_CreateAndGetReport -v`
Expected: FAIL，提示 `newTestRepository` 或 `CreateReport` 尚不存在。

- [ ] **Step 3: 实现最小 repository**

```go
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateReport(ctx context.Context, item db.Report) (int, error) {
	if err := r.db.WithContext(ctx).Create(&item).Error; err != nil {
		return 0, err
	}
	return item.ID, nil
}

func (r *Repository) GetReport(ctx context.Context, id int) (db.Report, error) {
	var resp db.Report
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&resp).Error
	return resp, err
}
```

- [ ] **Step 4: 补一条 workspace 基础聚合测试**

```go
func TestRepository_GetWorkspaceBase(t *testing.T) {
	repo := newTestRepository(t)
	workspace, err := repo.GetWorkspaceBase(context.Background(), 1)
	require.NoError(t, err)
	assert.Equal(t, 1, workspace.Report.ID)
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/service/report -run 'TestRepository_(CreateAndGetReport|GetWorkspaceBase)' -v`
Expected: PASS

---

### Task 3: 明确 reports API 契约并补齐定义接口

**Files:**
- Modify: `api/internal/pkg/model/view/report.go`
- Modify: `api/internal/api/apiv2/report/report.go`
- Modify: `api/internal/router/v2.go`
- Modify: `api/internal/api/apiv2/report/report_test.go`

- [ ] **Step 1: 写失败的 API 测试，覆盖报表定义读写**

```go
func TestReportCreateAndGet(t *testing.T) {
	// POST /api/v2/reports
	// GET /api/v2/reports/:report-id
	// 断言返回包含 name/queryMode/queryText/templateKey/outputFormat
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/api/apiv2/report -run TestReportCreateAndGet -v`
Expected: FAIL，提示路由或 handler 不存在。

- [ ] **Step 3: 补齐定义接口请求与响应模型**

```go
type ReqReportUpsert struct {
	ID           int    `json:"id" form:"id"`
	Name         string `json:"name" form:"name"`
	Desc         string `json:"desc" form:"desc"`
	Status       string `json:"status" form:"status"`
	QueryMode    string `json:"queryMode" form:"queryMode"`
	QueryText    string `json:"queryText" form:"queryText"`
	TemplateKey  string `json:"templateKey" form:"templateKey"`
	OutputFormat string `json:"outputFormat" form:"outputFormat"`
	DutyUID      int    `json:"dutyUid" form:"dutyUid"`
}
```

- [ ] **Step 4: 增加路由与最小 handler**

```go
// api/internal/router/v2.go
r.POST("/reports", core.Handle(report.ReportUpsert))
r.GET("/reports/:report-id", core.Handle(report.ReportGet))
```

```go
// api/internal/api/apiv2/report/report.go
func ReportUpsert(c *core.Context) { /* 绑定 ReqReportUpsert 并调用 reportservice.UpsertReport */ }
func ReportGet(c *core.Context) { /* 读取 report-id 并调用 reportservice.GetReport */ }
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/api/apiv2/report -run TestReportCreateAndGet -v`
Expected: PASS

---

### Task 4: 建立统一执行器与执行状态机

**Files:**
- Create: `api/internal/service/report/executor.go`
- Create: `api/internal/service/report/runtime.go`
- Modify: `api/internal/service/report/service.go`
- Modify: `api/internal/service/report/service_test.go`

- [ ] **Step 1: 写失败的 service 测试，约束 manual / schedule 共用同一路径**

```go
func TestService_RunPreviewAndRunScheduledShareExecutor(t *testing.T) {
	svc := newTestService(t)
	preview, err := svc.RunPreview(1)
	require.NoError(t, err)
	scheduled, err := svc.RunScheduled(1)
	require.NoError(t, err)
	assert.Equal(t, "manual", preview.Execution.Trigger)
	assert.Equal(t, "schedule", scheduled.Execution.Trigger)
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/service/report -run TestService_RunPreviewAndRunScheduledShareExecutor -v`
Expected: FAIL，提示执行器未统一或行为不一致。

- [ ] **Step 3: 提取统一执行入口**

```go
func (s *Service) RunPreview(reportID int) (view.RespReportPreviewRunResult, error) {
	return s.executeReport(reportID, "manual")
}

func (s *Service) RunScheduled(reportID int) (view.RespReportPreviewRunResult, error) {
	return s.executeReport(reportID, "schedule")
}
```

- [ ] **Step 4: 在执行器内显式落状态机**

```go
type executionFailureStage string

const (
	stageConfig executionFailureStage = "config"
	stageQuery  executionFailureStage = "query"
	stageRender executionFailureStage = "render"
	stageSend   executionFailureStage = "send"
)
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/service/report -run TestService_RunPreviewAndRunScheduledShareExecutor -v`
Expected: PASS

---

### Task 5: 接入真实 ClickHouse SQL 与 markdown 渲染

**Files:**
- Create: `api/internal/service/report/query_runner.go`
- Create: `api/internal/service/report/render.go`
- Modify: `api/internal/service/report/executor.go`
- Modify: `api/internal/service/report/service_test.go`

- [ ] **Step 1: 写失败的查询与渲染测试**

```go
func TestExecutor_QueryAndRenderMarkdown(t *testing.T) {
	exec := newTestExecutor(t)
	title, content, err := exec.buildReportContent(context.Background(), 1)
	require.NoError(t, err)
	assert.Contains(t, title, "日报")
	assert.Contains(t, content, "###")
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/service/report -run TestExecutor_QueryAndRenderMarkdown -v`
Expected: FAIL，提示真实 query/render 路径不存在。

- [ ] **Step 3: 写最小 ClickHouse SQL runner**

```go
type QueryRunner interface {
	RunSQL(ctx context.Context, report db.Report) ([]map[string]interface{}, error)
}
```

```go
func (r *clickhouseRunner) RunSQL(ctx context.Context, report db.Report) ([]map[string]interface{}, error) {
	if report.QueryMode != "sql" {
		return nil, fmt.Errorf("unsupported query mode: %s", report.QueryMode)
	}
	return r.source.Query(report.QueryText)
}
```

- [ ] **Step 4: 写最小 markdown 渲染**

```go
func RenderMarkdown(report db.Report, rows []map[string]interface{}) (string, string, error) {
	title := fmt.Sprintf("报表推送｜%s", report.Name)
	body := fmt.Sprintf("### %s\n\n查询结果行数：%d\n", title, len(rows))
	return title, body, nil
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/service/report -run TestExecutor_QueryAndRenderMarkdown -v`
Expected: PASS

---

### Task 6: 复用 `cv_alarm_channel`、接入重试并落执行记录

**Files:**
- Modify: `api/internal/service/report/sender.go`
- Modify: `api/internal/service/report/executor.go`
- Modify: `api/internal/service/report/repository.go`
- Modify: `api/internal/service/report/service_test.go`

- [ ] **Step 1: 写失败的发送与重试测试**

```go
func TestExecutor_SendWithRetryAndPersistChannelResults(t *testing.T) {
	svc := newTestService(t)
	resp, err := svc.RunPreview(1)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.Execution.ChannelResults)
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/service/report -run TestExecutor_SendWithRetryAndPersistChannelResults -v`
Expected: FAIL，提示 `channel_results` 尚未落库或重试逻辑缺失。

- [ ] **Step 3: 读取并过滤钉钉渠道**

```go
func (r *Repository) ListReportChannels(ctx context.Context) ([]db.AlarmChannel, error) {
	return db.AlarmChannelList(egorm.Conds{"typ": db.ChannelDingDing})
}
```

- [ ] **Step 4: 落实最小重试循环**

```go
for attempt := 0; attempt <= schedule.RetryTimes; attempt++ {
	err = sender.Send(channel, title, content)
	if err == nil {
		break
	}
	if attempt < schedule.RetryTimes {
		time.Sleep(time.Duration(schedule.RetryInterval) * time.Second)
	}
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/service/report -run TestExecutor_SendWithRetryAndPersistChannelResults -v`
Expected: PASS

---

### Task 7: 回写运行态并重构 scheduler 为表驱动

**Files:**
- Modify: `api/internal/service/report/scheduler.go`
- Modify: `api/internal/service/report/runtime.go`
- Modify: `api/internal/service/report/repository.go`
- Modify: `api/internal/service/init.go`
- Modify: `api/internal/service/report/service_test.go`

- [ ] **Step 1: 写失败的 scheduler 重载与卸载测试**

```go
func TestScheduler_ReloadAndUnloadByReportStatus(t *testing.T) {
	svc := newTestService(t)
	require.NoError(t, svc.StartScheduler())
	defer svc.StopScheduler()

	require.NoError(t, svc.DisableReport(1))
	registered, _ := svc.scheduler.Snapshot(1)
	assert.False(t, registered)
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/service/report -run TestScheduler_ReloadAndUnloadByReportStatus -v`
Expected: FAIL，提示 disable/unload 语义未实现。

- [ ] **Step 3: 改造 scheduler 装载来源**

```go
func (s *Scheduler) Start() error {
	reportIDs, err := s.service.repository.ListSchedulableReportIDs(context.Background())
	if err != nil {
		return err
	}
	for _, reportID := range reportIDs {
		if err := s.Reload(reportID); err != nil {
			return err
		}
	}
	s.cron.Start()
	return nil
}
```

- [ ] **Step 4: 回写 `last_run_at` / `next_run_at`**

```go
func (r *Repository) UpdateScheduleRuntime(ctx context.Context, reportID int, lastRunAt, nextRunAt time.Time) error {
	return r.db.WithContext(ctx).Model(&db.ReportSchedule{}).
		Where("report_id = ?", reportID).
		Updates(map[string]interface{}{"last_run_at": lastRunAt.Unix(), "next_run_at": nextRunAt.Unix()}).Error
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/service/report -run 'TestScheduler_(ReloadAndUnloadByReportStatus|RunScheduled)' -v`
Expected: PASS

---

### Task 8: 将 `/api/v2/reports/*` 全部切到真实 service / repository

**Files:**
- Modify: `api/internal/api/apiv2/report/report.go`
- Modify: `api/internal/service/report/service.go`
- Modify: `api/internal/api/apiv2/report/report_test.go`

- [ ] **Step 1: 写失败的 workspace 真数据 API 测试**

```go
func TestWorkspaceGet_ReturnsPersistedData(t *testing.T) {
	// 创建 report + schedule + execution
	// GET /api/v2/reports/workspace?reportId=1
	// 断言 list/editor/schedule/executions/runtime 都来自真实存储
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./api/internal/api/apiv2/report -run TestWorkspaceGet_ReturnsPersistedData -v`
Expected: FAIL，提示仍在返回 seed 数据。

- [ ] **Step 3: 移除正式路径上的 seed 依赖**

```go
func newService(repo *Repository, sender previewSender, runner QueryRunner) *Service {
	return &Service{
		repository: repo,
		sender:     sender,
		runner:     runner,
	}
}
```

- [ ] **Step 4: 让 list/workspace/executions/channels/configs/report 都走 repository**

```go
func (s *Service) GetWorkspace(reportID int) (view.RespReportWorkspace, error) {
	return s.repository.GetWorkspace(context.Background(), reportID)
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./api/internal/api/apiv2/report -v`
Expected: PASS

---

### Task 9: 补齐 `/v2/reports` 前端真实对接

**Files:**
- Modify: `ui-v2/src/shared/types/moduleWorkspace.ts`
- Modify: `ui-v2/src/shared/mock/moduleWorkspaceApi.ts`
- Modify: `ui-v2/src/domains/report/pages/ReportSchedulePage.tsx`
- Modify: `ui-v2/src/shared/state/useModuleWorkspace.ts`
- Modify: `ui-v2/tests/report-page.test.tsx`
- Modify: `ui-v2/tests/report-contracts.test.ts`

- [ ] **Step 1: 写失败的前端回归测试**

```tsx
it("loads persisted report workspace and shows execution history", async () => {
  render(<ReportSchedulePage />);
  expect(await screen.findByText("执行记录")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd ui-v2 && npm test -- report-page report-contracts`
Expected: FAIL，提示字段结构与真实接口不一致。

- [ ] **Step 3: 对齐真实 contract 类型**

```ts
export interface ReportWorkspace {
  activeReportId: number;
  list: ReportListItem[];
  editor: ReportEditorDraft;
  schedule: ReportSchedule;
  executions: ReportExecutionRecord[];
  runtime: ReportScheduleRuntime;
}
```

- [ ] **Step 4: 切换页面逻辑到真实接口字段**

```tsx
const { workspace, saveReport, saveSchedule, runPreview } = useModuleWorkspace();
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd ui-v2 && npm test -- report-page report-contracts`
Expected: PASS

---

### Task 10: 完成分层验证与文档收口

**Files:**
- Modify: `openspec/changes/2026-03-31-reports-clickhouse-dingtalk/tasks.md`
- Modify: `progress.md`
- Modify: `findings.md`

- [ ] **Step 1: 运行后端 repository / service / API / scheduler 测试**

Run: `go test ./api/internal/service/report ./api/internal/api/apiv2/report -v`
Expected: PASS

- [ ] **Step 2: 运行前端回归测试**

Run: `cd ui-v2 && npm test -- report-page report-contracts`
Expected: PASS

- [ ] **Step 3: 运行前端构建验证**

Run: `cd ui-v2 && npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: 回写 OpenSpec 与恢复文件**

```md
- 将已完成任务在 `openspec/.../tasks.md` 中标记为 done
- 在 `progress.md` 记录验证命令与结果
- 在 `findings.md` 记录运行限制与残余风险
```

- [ ] **Step 5: 提交收口**

```bash
git add openspec/changes/2026-03-31-reports-clickhouse-dingtalk docs/superpowers/plans/2026-03-31-reports-clickhouse-dingtalk-implementation.md progress.md findings.md
git commit -m "docs: add reports real pipeline implementation plan"
```

---

## Self-Review

### Spec coverage

- 独立 reports 建模：Task 1-2
- 真实 ClickHouse SQL：Task 5
- 复用 `cv_alarm_channel`：Task 6
- 真实执行记录：Task 1、Task 2、Task 6
- 表驱动 scheduler：Task 7
- `/api/v2/reports/*` 真实化：Task 3、Task 8
- `/v2/reports` 页面真实对接：Task 9
- 分层验证与文档回写：Task 10

### Placeholder scan

- 未使用 `TODO`、`TBD`、`later`
- 每个任务都给出具体文件与测试命令

### Type consistency

- 统一以 `reportID` 表示报表主键
- `RunPreview` / `RunScheduled` 统一进入 `executeReport`
- repository 负责真实存储，service 负责编排，scheduler 只负责装载与触发
