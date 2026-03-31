# Reports Task Plan

## Goal

在现有 ClickVisual 仓库中，将 `/api/v2/reports/*` 与 `/v2/reports` 从 demo 链路升级为真实产品闭环：

1. 独立 reports 建模
2. 真实 ClickHouse SQL 查询
3. 真实定时调度
4. 复用钉钉渠道发送
5. 真实执行记录与页面读写

## Spec Truth Source

- Active OpenSpec change: `openspec/changes/2026-03-31-reports-clickhouse-dingtalk/`
- Canonical spec files:
  - `proposal.md`
  - `design.md`
  - `tasks.md`
- 设计镜像文档：
  - `docs/superpowers/specs/2026-03-31-reports-clickhouse-dingtalk-design.md`
- 本文件只保留 orchestrator 视角的状态、恢复锚点与下一步动作。

## Current State

- 仓库已存在 OpenSpec，但本轮开始前没有覆盖 reports 真实闭环的 active change。
- 当前 `api/internal/service/report` 仍以内存 seed 为主：
  - 报表定义、调度、执行历史未落库
  - 报表内容没有真实查询 ClickHouse
  - 页面读取的仍是演示数据
- 仓库中已有可复用能力：
  - ClickHouse 查询能力
  - `cv_alarm_channel` 钉钉渠道
- 用户已确认本轮边界：
  - 目标是完整产品闭环，不是最小试验链路
  - reports 独立建模，不绑定 `bigdata node/workflow`
  - 查询本期只支持 `ClickHouse SQL`
  - 渠道直接复用 `cv_alarm_channel`

## Execution Stage

- stage: planning

## Tasks

| task_id | depends_on | status | owner | priority | last_updated | summary |
|---|---|---|---|---|---|---|
| O1 | - | done | A | high | 2026-03-31 10:46:43 +0800 | 完成 OpenSpec 发现、恢复层恢复与现状扫描，确认 reports 当前仍为 demo 链路 |
| O2 | O1 | done | A | high | 2026-03-31 10:46:43 +0800 | 与用户完成设计边界收敛：独立建模、ClickHouse SQL、复用 `cv_alarm_channel` |
| O3 | O2 | done | A | high | 2026-03-31 10:46:43 +0800 | 已写入 OpenSpec active change、设计 spec，并完成用户审阅确认 |
| O4 | O3 | done | A | high | 2026-03-31 10:46:43 +0800 | 已按审查意见重排 OpenSpec tasks，并产出可执行实现计划 |
| O5 | O4 | ready | A | high | 2026-03-31 10:46:43 +0800 | 默认进入 Subagent-Driven 执行准备，等待派发第一个实现任务批次 |

## Recovery Anchors

- current_owner: A
- current_task: O5
- workflow_stage: planning
- last_completed_step: 已完成实现计划文档写入与 OpenSpec 任务重排
- next_action: 按实现计划派发第一个执行任务批次
- resume_from: 读取 active OpenSpec change 与 `docs/superpowers/specs/2026-03-31-reports-clickhouse-dingtalk-design.md`
- incomplete_boundary: 计划已完成，尚未开始代码执行
- recovery_status: resumable

## Constraints

- OpenSpec `tasks.md` 是任务真源
- 当前处于设计与计划阶段，未进入代码实现
- 所有后续实现需围绕“真实闭环”收敛，不能回退到内存 seed 主路径

## Open Questions

1. 当前无新的产品边界问题；下一步为实现计划拆分。

## Risks

- 旧 `report` demo 逻辑与新真实实现并存时，容易产生双路径分叉。
- 若接口仍将报表定义与调度配置混写到 `configs`，后续维护成本会继续上升。
