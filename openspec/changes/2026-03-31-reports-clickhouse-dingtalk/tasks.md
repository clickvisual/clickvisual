# 任务：reports 真实 ClickHouse 定时报表与钉钉推送闭环

- [x] T1 建立 OpenSpec 与恢复层
  - 在 OpenSpec 中创建本次 active change
  - 将 `task_plan.md`、`progress.md`、`findings.md` 切换到本次 reports 工作
  - 验收：恢复文件能够明确当前目标、当前任务、下一步动作

- [x] T2 设计并落库 reports schema / migration / model constraints
  - 新增 `cv_report`、`cv_report_schedule`、`cv_report_execution`
  - 补齐表约束、索引、状态字段与 JSON 字段存储策略
  - 验收：migration 可落地，模型约束与字段语义清晰，基础表测试可通过

- [x] T3 建立 reports repository 与 workspace 聚合读取
  - 完成报表定义、调度配置、执行记录的 repository
  - 完成 workspace 所需真实聚合读取
  - 验收：可通过测试完成 CRUD、列表、execution 列表与 workspace 基础聚合

- [x] T4 明确 reports API 契约并补齐定义接口
  - 梳理 `report`、`configs`、`channels`、`workspace`、`executions` 的真实语义
  - 补齐报表定义接口与错误模型
  - 验收：后端契约稳定，前端可按新契约对接

- [x] T5 建立统一执行器与执行状态机
  - 统一 `RunPreview` 与 `RunScheduled` 到 `executeReport(reportID, trigger)`
  - 覆盖配置错误、查询失败、渲染失败、发送失败与部分成功状态
  - 验收：manual / schedule 共用一条执行路径，执行状态与错误摘要可落库

- [x] T6 打通真实 ClickHouse SQL 查询与 markdown 渲染
  - 为执行器接入真实 ClickHouse SQL
  - 完成最小 markdown 渲染逻辑
  - 验收：手动执行可根据真实 SQL 结果生成报表内容

- [x] T7 打通钉钉渠道复用、重试与执行记录落库
  - 从 `cv_alarm_channel` 读取钉钉渠道并过滤可用项
  - 发送结果写入 `cv_report_execution.channel_results`
  - 落实 `is_retry`、`retry_times`、`retry_interval`
  - 验收：手动执行后能看到真实渠道发送结果、重试行为与执行历史

- [x] T8 打通运行态回写与 scheduler 表驱动装载
  - 回写 `last_run_at`、`next_run_at`
  - 处理 scheduler 的装载、重载与卸载
  - 验收：定时任务可真实触发 ClickHouse 查询并发送钉钉，runtime 展示与真实状态一致

- [x] T9 补齐 `/v2/reports` 前端真实对接
  - `/v2/reports` 切到真实接口数据源
  - 完成列表、保存、手动执行、查看历史与运行态展示闭环
  - 验收：页面可完成真实数据闭环且不回退核心交互

- [x] T10 完成分层验证与文档收口
  - 分层补齐 repository、service、API、scheduler、frontend 测试
  - 记录执行限制、已知风险与验证证据
  - 验收：关键测试通过，并在恢复文件中留下明确结论

- [x] T11 收紧 `/v2/reports` 页面信息密度
  - 在不改变真实接口与核心交互语义的前提下，压缩 header、hero、panel、form、table、status card 的垂直占用
  - 为 reports 页面增加局部 compact 样式，避免影响其它 `ui-v2` 模块
  - 收敛运行态、投递对象、执行记录中的重复字段前缀与低密度堆叠
  - 验收：`/v2/reports` 首屏明显更紧凑，仍保留创建、编辑、保存调度、执行预览、切换任务与运行态展示
