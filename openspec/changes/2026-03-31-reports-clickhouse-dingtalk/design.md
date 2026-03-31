# 设计：reports 真实 ClickHouse 定时报表与钉钉推送闭环

## 总体思路

采用独立 `reports` 领域分层，而不是继续扩展当前内存 seed 方案，也不挂接现有 `bigdata` 体系。

本次设计目标是保留现有 `/api/v2/reports/*` 与 `/v2/reports` 的产品形态，同时将后端底座替换为真实存储、真实查询、真实执行记录。

## 领域边界

### 属于 reports 域

- 报表定义
- 调度配置
- 执行器
- 执行记录
- 运行态聚合
- 页面聚合接口

### 复用但不接管

- `cv_alarm_channel`：作为钉钉渠道来源
- ClickHouse 数据源访问能力：复用现有仓库中的 ClickHouse 查询组件

### 明确不绑定

- `bigdata node`
- `cv_bd_crontab`
- `workflow`

## 数据模型

### `cv_report`

保存报表定义本身。

建议字段：

- `id`
- `name`
- `desc`
- `status`
- `query_mode`
- `query_text`
- `template_key`
- `output_format`
- `duty_uid`
- `creator_uid`
- `ctime`
- `utime`
- `dtime`

设计约束：

- `query_mode` 本期仅允许 `sql`
- `status` 至少支持 `enabled`、`paused`
- `template_key` 与 `output_format` 先支持 markdown 文本渲染场景

### `cv_report_schedule`

保存调度配置。

建议字段：

- `report_id`
- `cron`
- `status`
- `channel_ids`
- `is_retry`
- `retry_times`
- `retry_interval`
- `last_run_at`
- `next_run_at`
- `ctime`
- `utime`

设计约束：

- 一张报表仅保留一条当前生效调度配置
- `channel_ids` 复用现有 `cv_alarm_channel.id`

### `cv_report_execution`

保存每次执行记录。

建议字段：

- `id`
- `report_id`
- `trigger`
- `status`
- `started_at`
- `ended_at`
- `duration_seconds`
- `operator_name`
- `error_message`
- `channel_results`
- `rendered_title`
- `rendered_content`
- `ctime`

设计约束：

- `channel_results` 以 JSON 文本保存逐渠道发送结果
- 允许记录部分成功、部分失败的细节

## 后端分层

### db model / repository

新增 reports 领域的表结构与数据库访问层，负责：

- 报表定义读写
- 调度配置读写
- 执行记录写入与列表查询
- workspace 聚合读取

### service

重构 `api/internal/service/report`，将其改造成真实领域服务，负责：

- 报表与调度保存校验
- 查询 ClickHouse
- 模板渲染
- 发送钉钉
- 落执行记录
- 构建前端需要的 workspace 聚合响应

### executor

统一执行入口：

- `RunPreview(reportID)` -> `trigger=manual`
- `RunScheduled(reportID)` -> `trigger=schedule`

两者都调用同一条 `executeReport(reportID, trigger)`，避免继续出现两套行为分叉。

## 执行链路

统一主链路如下：

1. 读取 `cv_report` 与 `cv_report_schedule`
2. 校验报表状态、调度状态、SQL 内容、渠道配置
3. 执行真实 ClickHouse SQL
4. 按 `template_key + output_format` 渲染 markdown 内容
5. 逐个向 `cv_alarm_channel` 中选中的钉钉 webhook 发送
6. 将执行结果写入 `cv_report_execution`
7. 回写 `last_run_at`，并基于 cron 重新计算 `next_run_at`

## ClickHouse 查询策略

本期仅支持 SQL 报表。

实现要求：

- 复用仓库现有 ClickHouse 数据源能力，避免再造一套连接管理
- 对外仅暴露 reports 所需最小查询接口
- 若后续扩展到其他查询模式，扩展点放在 executor 内部的 query runner 抽象层，不提前做复杂通用化

## 钉钉发送策略

渠道来源：

- 读取 `cv_alarm_channel`
- 仅暴露钉钉类型渠道给 reports 页面与执行器

发送策略：

- 报表域可先保留自己的 markdown 发送实现
- 但接口语义需与现有告警渠道保持兼容
- 发送失败要在 `channel_results` 与执行记录中完整落地

## 调度器设计

使用 reports 域自己的 scheduler，但数据源改为真实表：

- 服务启动时扫描已启用报表与调度配置
- 为 `report.status=enabled` 且 `schedule.status=enabled` 的报表注册 cron entry
- 保存报表或调度后，重载对应报表的 entry
- 触发时直接调用统一执行器

约束：

- 本期只保证单实例语义
- 不实现多实例调度抢占

## API 设计

保留现有 `/api/v2/reports/*` 主路径，尽量减少前端破坏性变化。

### 保留并改为真实实现

- `GET /api/v2/reports/list`
- `GET /api/v2/reports/workspace`
- `POST /api/v2/reports/configs`
- `GET /api/v2/reports/configs/:report-id`
- `POST /api/v2/reports/preview-run`
- `GET /api/v2/reports/executions`
- `GET /api/v2/reports/channels`

### 建议补充

- `POST /api/v2/reports`
- `GET /api/v2/reports/:report-id`

原因：

- 将“报表定义”与“调度配置”从接口语义上拆开
- 避免继续把 editor 与 schedule 都塞入 `configs`

## 前端兼容策略

前端 `/v2/reports` 页面继续复用当前产品结构，但其数据源改为真实接口。

本次至少需要确保以下操作不回退：

- 报表列表读取
- 报表定义保存
- 调度保存
- 钉钉渠道选择
- 手动执行
- 执行记录查看
- 运行态展示

## 失败处理

### 配置错误

例如：

- 报表不存在
- 报表未启用
- SQL 为空
- 未选择渠道

处理：

- 不进入发送阶段
- 直接写失败执行记录
- 返回明确错误信息给前端

### 查询失败

例如 ClickHouse 连接异常或 SQL 执行异常。

处理：

- 写失败执行记录
- 保留错误摘要
- 若启用重试，则按调度配置进行有限重试

### 渲染失败

例如模板不存在、结果集转换异常。

处理：

- 写失败执行记录
- 不进入渠道发送

### 发送失败

允许部分成功、部分失败。

处理：

- 在 `channel_results` 中保留逐渠道明细
- 聚合后的执行状态至少能区分成功和失败

## 验证要求

### 后端

- reports repository 层 CRUD 与聚合读取测试
- service 层真实执行链路测试
- scheduler 装载与重载测试
- API 层接口测试

### 前端

- `/v2/reports` 关键交互回归测试
- 至少覆盖列表、保存配置、手动执行、执行历史展示

## 风险与控制

### 风险 1：旧 demo 逻辑与新真实逻辑并存导致分叉

控制：

- 将 seed 数据限制在测试场景
- 正式路径全部切到 repository/service

### 风险 2：接口语义仍然混乱

控制：

- 补充报表定义相关接口
- `workspace` 只承担页面聚合职责

### 风险 3：调度状态与页面运行态不同步

控制：

- `last_run_at`、`next_run_at`、执行记录全部落库
- runtime 聚合统一从真实存储与 scheduler snapshot 生成
