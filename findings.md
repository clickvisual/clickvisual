# ClickVisual v2 Findings

## 2026-03-30

### Repository facts

- 项目根目录存在 `ui/`、`api/`、`openspec/`、`v2/` 等目录。
- 前端主应用为 `ui/`，`ui/package.json` 显示当前使用：
  - `@umijs/max`
  - `antd`
  - `@ant-design/pro-layout`
  - `react` / `react-dom` 18
- 现有主路由集中在：
  - `/query`
  - `/configure`
  - `/alarm/*`
  - `/bigdata`
  - `/sys/*`

### v2 design assets

- `v2/stitch/chronos_amber/DESIGN.md` 提供了新的视觉语言：
  - 更偏 editorial / asymmetric / tonal layering
  - 不鼓励传统边框
  - 强调橙色行动按钮与右侧 context panel
- `v2/stitch/` 下存在 5 个核心页面原型：
  - `dashboard_overview_with_ai_suggestions`
  - `base_query_interface_aliyun_sls_style`
  - `scheduled_reports_dingtalk_push`
  - `alerting_system_dingtalk_notification`
  - `configuration_center_ai_dingtalk_config`

### Spec state

- `openspec/` 目录存在，但 `openspec/specs` 与 `openspec/changes` 当前没有可用 spec 文件。
- 仓库根目录此前不存在 `task_plan.md`、`progress.md`、`findings.md`。
- 已新增 active OpenSpec change：
  - `openspec/changes/2026-03-30-clickvisual-v2-shell/proposal.md`
  - `openspec/changes/2026-03-30-clickvisual-v2-shell/design.md`
  - `openspec/changes/2026-03-30-clickvisual-v2-shell/tasks.md`

### Initial orchestration judgment

- 这是一个复杂、多模块、需可恢复状态的任务，适合用 `multi-agent-spec-orchestration`。
- 在实现前必须先完成一轮设计确认与实施边界冻结。
- 用户已确认实施载体为独立新前端应用。
- 用户已确认首期交付目标是完整五模块可运行壳子。
- 用户已确认允许在 spec 中定义 `v2` 专用接口/聚合接口。
- 本次纠偏后，OpenSpec 已提升为当前工作的唯一 spec / task 真源。

## 2026-03-31

### Reports 现状事实

- 仓库是 OpenSpec 项目，但当前 active change 缺失；此前只存在一个已归档的 v2 壳层 change。
- `api/internal/service/report` 当前仍是 demo 结构：
  - 报表列表、编辑态、调度态、执行态主要来自内存 seed
  - 调度器可以真实注册 cron
  - 钉钉可以真实发 webhook
  - 但报表内容没有真实查询 ClickHouse，配置和历史也没有真实落库

### 可复用能力

- 仓库已有 ClickHouse 查询能力，可供 reports 域复用。
- 仓库已有告警渠道表 `cv_alarm_channel`，其中钉钉 webhook 可直接复用。
- 仓库已有 `cv_bd_crontab`，但用户已明确本轮 reports 不绑定 `bigdata node/workflow`，因此不能把它当成 reports 的主模型。

### 用户已确认的边界

- 目标是“完整产品闭环”，不是只做一个可运行最小链路。
- reports 采用独立建模，不挂接现有 `bigdata` 体系。
- 查询能力本期仅支持真实 `ClickHouse SQL`，但设计要保留后续扩展位。
- 推送渠道直接复用 `cv_alarm_channel` 中的钉钉渠道。

### 当前编排判断

- 这是跨模型、执行器、调度器、API、前端页面的多模块能力变更，继续适用 `multi-agent-spec-orchestration`。
- 按 `brainstorming` 流程，当前已完成设计收敛，下一步必须等待用户对 written spec 做文件级审阅。
