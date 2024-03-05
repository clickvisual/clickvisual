# 版本列表

## [v1.0.0](https://github.com/clickvisual/clickvisual/releases/tag/v1.0.0)

- **优化：**
 - 由 @qianque7 在 [#960](https://github.com/clickvisual/clickvisual/pull/960) 修复 bug
 - 由 @kl7sn 在 [#980](https://github.com/clickvisual/clickvisual/pull/980) 修复错误访问现有数据库
 - 由 @kl7sn 在 [#986](https://github.com/clickvisual/clickvisual/pull/986) 修复搜索字段未完全显示
 - 由 @kl7sn 在 [#992](https://github.com/clickvisual/clickvisual/pull/992) 修复分析字段显示优化
 - 由 @qianque7 在 [#996](https://github.com/clickvisual/clickvisual/pull/996) 修复部署子域名时无法获取 luckysheet 的问题
 - 由 @kl7sn 在 [#1005](https://github.com/clickvisual/clickvisual/pull/1005) 修复 bug
 - 由 @kl7sn 在 [#1016](https://github.com/clickvisual/clickvisual/pull/1016) 修复过滤标签无法正确过滤的问题
 - 由 @isyanthony 在 [#1078](https://github.com/clickvisual/clickvisual/pull/1078) 修复搜索日志
 - 由 @isyanthony 在 [#1108](https://github.com/clickvisual/clickvisual/pull/1108) 修复 golint
 - 由 @isyanthony 在 [#1079](https://github.com/clickvisual/clickvisual/pull/1079) 修复和升级实现
 - 由 @isyanthony 在 [#1080](https://github.com/clickvisual/clickvisual/pull/1080) 恢复错误
 - 由 @isyanthony 在 [#1085](https://github.com/clickvisual/clickvisual/pull/1085) 修复中
 - 由 @isyanthony 在 [#1089](https://github.com/clickvisual/clickvisual/pull/1089) 修复 agent 获取日志丢失第一行
 - 由 @isyanthony 在 [#1074](https://github.com/clickvisual/clickvisual/pull/1074) 修复搜索日志
 - 由 @isyanthony 在 [#1108](https://github.com/clickvisual/clickvisual/pull/1108) 修复 golint

- **优化：**
  - 由 @kl7sn 在 [#1034](https://github.com/clickvisual/clickvisual/pull/1034) 优化集群副本分片计算逻辑
  - 由 @kl7sn 在 [#1114](https://github.com/clickvisual/clickvisual/pull/1114) 特性：static resources increase gzip
  - 由 @kl7sn 在 [#1116](https://github.com/clickvisual/clickvisual/pull/1116) 特性：delete associated permissions after data table deletion
  - 由 @kl7sn 在 [#1115](https://github.com/clickvisual/clickvisual/pull/1115) 优化 aggregate alarm link issues
  - 由 @kl7sn 在 [#1111](https://github.com/clickvisual/clickvisual/pull/1111) 修复 golint
  - 由 @isyanthony 在 [#1071](https://github.com/clickvisual/clickvisual/pull/1071) 清理代码并添加注释
  - 由 @kl7sn 在 [#1112](https://github.com/clickvisual/clickvisual/pull/1112) 特性：aggregation alarm mode type judgment
  - 由 @kl7sn 在 [#1114](https://github.com/clickvisual/clickvisual/pull/1114) 特性：static resources increase gzip
  - 由 @kl7sn 在 [#1115](https://github.com/clickvisual/clickvisual/pull/1115) 优化 aggregate alarm link issues
  - 由 @kl7sn 在 [#1116](https://github.com/clickvisual/clickvisual/pull/1116) 特性：delete associated permissions after data table deletion


## [v0.4.5](https://github.com/clickvisual/clickvisual/releases/tag/v0.4.5)

- 功能
  - 支持 databend 数据库作为数据源 [#823](https://github.com/clickvisual/clickvisual/pull/823)
  - 支持 buffer-null-mv 方式进行日志存储 [#826](https://github.com/clickvisual/clickvisual/pull/826)
  - 支持 metrics.samples 存储自定义 tags [#840](https://github.com/clickvisual/clickvisual/pull/840)

- 优化&修复
  - 修复调度配置保存失败的问题 [#799](https://github.com/clickvisual/clickvisual/pull/799)
  - 优化日志页面/时间兼容更多格式/搜索高亮显示不区分大小写 [#804](https://github.com/clickvisual/clickvisual/pull/804)
  - 日志列表接口增加可选 count 数据返回 [#805](https://github.com/clickvisual/clickvisual/pull/805)
  - 优化告警检测中 alertmanager url 获取方式 [#808](https://github.com/clickvisual/clickvisual/pull/808)
  - 优化搜索框模糊匹配性能 [#814](https://github.com/clickvisual/clickvisual/pull/814)
  - 使用标签过滤日志的时使用精确类型匹配 [#839](https://github.com/clickvisual/clickvisual/pull/839)
  - 将告警检查统计信息的查询框更改为 codemirror 编辑器 [#842](https://github.com/clickvisual/clickvisual/pull/842)
  - 修复告警触发中配置的 sum/avg/max/min/count 函数支持 [#845](https://github.com/clickvisual/clickvisual/pull/845)

* [@hantmac](https://github.com/hantmac) made their first contribution in [#819](https://github.com/clickvisual/clickvisual/pull/819)

## [v0.4.4](https://github.com/clickvisual/clickvisual/releases/tag/v0.4.4)

- 功能
  - 支持检索条件收藏
  - 支持企业微信告警推送
  - 支持按标签输入查询语句
  - 定时任务失败后推送该告警
  - 日志查询框兼容粘贴多行代码
  - 拓扑图增加副本和分片数量显示
  - 告警规则下发支持 Prometheus Operator
  - 告警数据存储表 metrics.samples 一键创建
  - 支持通过模板方式创建 EGO 框架支持的全套日志库

- 优化&修复
  - 告警推送模块代码重构
  - 趋势图数据计算逻辑优化
  - 查询语句自动填充逻辑调整
  - 更新 swagger 文档展示样式
  - 链路日志库支持单页数据条数配置
  - 支持聚合告警模式下日志详情读取推送
  - 修复时间轴分辨率错误和表模式数据显示异常
  - 修复使用分布式表产生的告警数据的问题

* @pigcsy made their first contribution in [https://github.com/clickvisual/clickvisual/pull/725](https://github.com/clickvisual/clickvisual/pull/725)

## [v0.4.3](https://github.com/clickvisual/clickvisual/releases/tag/v0.4.3)

- 功能
  - 告警模块
    - 独立告警配置，增加基础组件环境检测包括 prometheus/alertmanager，并进行 remote_read 配置检测
    - 告警规则下发时增加【配置中】状态，在完成 prometheus 规则加载检测后，变更为【正常】
    - 支持多条件告警
  - 拓扑页面支持节点建表语句查询
  - 支持按照 select 字段次序显示结果
  - 日志查询提示，记录查询历史以及常用函数提示

- 优化&修复
  - 支持数组显示以及点击查询
  - 链路库展示兼容更多的日期格式
  - 日志查询编辑器更改为 codemirror
  - 修复隐藏字段权限检测错误
  - 修复日志库潜在的事务锁定问题
  - 修复日志库链路模式下的错误显示，兼容大小写样式
  - 修复集群中已有日志库添加告警规则提示的 cluster 缺失问题


## [v0.4.2](https://github.com/clickvisual/clickvisual/releases/tag/v0.4.2)

- 功能
  - 增加对链路日志库数据分析功能
  - 用户管理模块，基础 CURD 和用户密码重置功能

- 优化&修复
  - clickhouse-go 升级为 v2.3.0，并支持 http 和 https 协议 [@laojianzi](https://github.com/laojianzi)
  - 优化已接入日志时间字段筛选逻辑，使用 like 方式进行过滤 [@shushenghong](https://github.com/shushenghong)
  - 链路日志库增加更多数据展示
  - 一般日志库与链路日志库跳转交互优化
  - 从分析日志内容格式来确认日志库类型，调整为通过具体的用户配置来进行确认
  - 告警列表支持 id 过滤，避免同名产生的误导
  - 删除对集群中非必要数据进行的 watch 逻辑
  - 针对大量数据的缓慢日志渲染进行了优化
  - 链路日志库分析落地数据库创建失败问题
  - 对不同时间区间使用不同的时间精度来显示时间点
