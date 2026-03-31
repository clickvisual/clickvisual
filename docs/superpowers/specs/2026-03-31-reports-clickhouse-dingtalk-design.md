# Reports 真实 ClickHouse 定时报表与钉钉推送设计

## 范围结论

- 本期目标是完成 reports 的完整产品闭环，而不是只做一个最小试验链路。
- reports 采用独立领域建模，不绑定现有 `bigdata node/workflow`。
- 查询能力本期只支持真实 `ClickHouse SQL`，但数据模型和接口保留扩展位。
- 推送渠道直接复用现有 `cv_alarm_channel` 中的钉钉渠道。

## 方案选择

最终采用“独立 reports 领域分层”方案，而不是在当前 `api/internal/service/report` 的内存 seed 方案上继续堆功能。

原因：

- 需要同时支撑报表定义、调度、执行记录、真实页面聚合
- 后续还要扩查询模式与更多输出能力
- 如果继续在当前 demo 方案上演进，接口语义、执行路径与状态管理会越来越混乱

## 目标设计

### 数据模型

新增三张核心表：

1. `cv_report`
2. `cv_report_schedule`
3. `cv_report_execution`

其中：

- `cv_report` 表示报表定义
- `cv_report_schedule` 表示调度与渠道配置
- `cv_report_execution` 表示每次执行与发送结果

渠道继续复用 `cv_alarm_channel`。

### 执行链路

手动执行与定时执行统一收敛到一条真实主链路：

1. 读取报表与调度配置
2. 校验配置与状态
3. 执行真实 ClickHouse SQL
4. 渲染 markdown 报表
5. 调用钉钉 webhook
6. 落执行记录
7. 回写运行时间与下一次执行时间

### 接口策略

保留 `/api/v2/reports/*` 主路径，尽量减少前端破坏性调整。

已有接口改为真实存储与真实执行实现：

- `list`
- `workspace`
- `configs`
- `preview-run`
- `executions`
- `channels`

同时建议补充报表定义的独立接口，避免继续把 editor 与 schedule 都压进 `configs`。

### 失败处理

失败分类为：

- 配置错误
- 查询失败
- 渲染失败
- 发送失败

所有失败都要进入执行记录，且发送失败需要保留逐渠道细节。

### 调度策略

reports 保留自己的 scheduler，但数据源改成真实表。

- 启动时装载已启用报表
- 保存报表或调度后重载 entry
- 暂不处理多实例抢占

## 验证要求

至少覆盖：

- reports repository 测试
- reports service 执行链路测试
- scheduler 装载与重载测试
- `/api/v2/reports/*` API 测试
- `/v2/reports` 前端关键回归测试

## 已知限制

- 本期不支持 DSL 报表真实执行
- 本期不做附件或图片导出
- 本期只保证单实例调度语义
