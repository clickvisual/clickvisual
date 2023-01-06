# 常见问题

## ClickVisual 性能测试报告？
ClickVisual 的定位是 ClickHouse 的 GUI 工具，帮助用户快速搭建 ClickHouse 的最佳实践。  
性能相关的测试对比可以关注 ClickHouse 的 ES 的差异: 

- [https://mp.weixin.qq.com/s/hP0ocT-cBCeIl9n1wL_HBg](https://mp.weixin.qq.com/s/hP0ocT-cBCeIl9n1wL_HBg)
- [https://mp.weixin.qq.com/s/n2I94X6tz2jOABzl1djxYg](https://mp.weixin.qq.com/s/n2I94X6tz2jOABzl1djxYg)

## 哪些组件是必需？
可以参考这个图，clickvisual 大致上分为以下三个模块，每个模块使用依赖的组件不同，可以选择使用。
- 日志检索
- 日志告警
- 数据分析

![](../../../images/technical-architecture.png)

可以使用已有组件，不需要完全新建。例如 ClickHouse 使用已有的组件时进行数据库创建操作，可能出现重名问题，此时 ClickVisual 会对数据库创建失败。

## 上生产环境没有集群版？
石墨内部已在生产环境使用，自建集群和阿里云集群都在正常使用。

## 目前哪些企业已使用该日志平台？
可以参考这个 issues，由使用者自发填写 [https://github.com/clickvisual/clickvisual/issues/154](https://github.com/clickvisual/clickvisual/issues/154)

## 服务启动后跳转到 localhost?

现象

![img.png](../../../images/qa-1.png)

解决

服务配置中包含地址设置，调整这个地址即可
```toml
[app]
rootURL = "http://localhost:19001"
 ```
- 此处的rootURL 必须有http:// 前缀，不然会是一个非法的url不能使用

配置文件对应地址
- docker：/data/all-in-one/clickvisual/config/docker.toml
- 代码启动：/config/default.toml

## Kafka 有数据 ClickVisual 中没日志?

现象

在 kowl 中能看到 topics 是有数据的，但是在 ClickVisual 创建了 ClickHouse 实例，也在日志中添加了数据库列表并新增了日志库，但是没有数据出来。我怎么看数据有没有到 ClickHouse？
![img.png](../../../images/qa-2.png)

排查

![img_1.png](../../../images/qa-2-2.png)

![img_2.png](../../../images/qa-2-3.png)

![img_3.png](../../../images/qa-2-4.png)

查看这个 steam_sql 的结构，确保如下图所示在 kafka 里面传输的日志数据是以上结构的子集。

例如上面这两个就无法对应，steam_sql 中的 `_time_` 是 String，但是 kafka 里面的是 Float，无法正常消费。

这个配置在这里设置

![img_4.png](../../../images/qa-2-5.png)

解决

1. 调整 kafka 采集数据内容，保证 kafka 采集数据字段为 stream 表的字段的子集
2. 调整 `kafka_skip_broken_messages` 参数，跳过格式异常的数据

需要保证日志部分数据在 kafka 中为

> `_time_`: 对应 string 或 float 类型  
> `_log_`: 原始日志

![img.png](../../../images/qa-2-6.png)

## 没有建表的 SQL?

服务启动成功后访问 http://localhost:19001 可以初始化数据库

## 报警有数据满足触发条件却没触发？

告警是将 metrics.samples 作为 prometheus 的远程存储，所以从一下两个方向去排查：
1. metrics.samples 是否有数据，并且 prometheus 能否正常读取到数据
2. prometheus 的 rule 是否正常下发了
   - 可能存在 rule 路径配置不正确
   - prometheus 没有热更新 [https://songjiayang.gitbooks.io/prometheus/content/qa/hotreload.html](https://songjiayang.gitbooks.io/prometheus/content/qa/hotreload.html)

## metrics.samples 数据与预期不一致

![img.png](../../../images/qa-data-diff.png)

该表数据写入的逻辑：
1. 通过物化视图将日志表中的数据经过转换写入，例如如下物化视图，在数据写入 yy.yy 中的时候触发转换，此时只对缓冲区内的数据进行了统计，可能出现 1s 内多条数据的情况；

```
   CREATE MATERIALIZED VIEW xx.xx TO metrics.samples AS
   SELECT
   toDate(_time_second_) as date,
   'clickvisual_alert_metrics' as name,
   array('uuid=6ec0fd1c-0103-4d28-abb5-b317e5977c0c') as tags,
   toFloat64(count(*)) as val,
   _time_second_ as ts,
   toDateTime(_time_second_) as updated
   FROM yy.yy
   WHERE (`_container_name_`='app' or `_container_name_`='app') and `_namespace_`='default' and `code`>'499' GROUP by _time_second_;
```

2. 确认 [graphite_rollup 配置](https://clickvisual.gocn.vip/clickvisual/03funcintro/alarm-function-configuration-description.html#clickhouse-%E9%85%8D%E7%BD%AE)， function 部分使用 sum，保证 1s 内的多条数据进行求和，保证数据准确。

相关文档
- [clickhouse 物化视图的踩坑记录](https://juejin.cn/post/6903508511637340173)

## 告警触发后三方客户端无法收到消息

1. 确认 AlertManager 中填写的回调地址是否正确
2. 确认 AlertManager 告警推送记录
3. 查询 ClickVisual 报错日志，提交 [GitHub ClickVisual Issue](https://github.com/clickvisual/clickvisual/issues)
   > 过滤关键字 webhook 和 notification
4. 如果没有上述报错日志，提交 [GitHub ClickVisual Issue](https://github.com/clickvisual/clickvisual/issues)
   - 提供通知方式的 Type 类型：钉钉/飞书/Stack
   - 提供 debug 日志，修改项目日志级别 level 为 debug
   > 过滤关键字 alarm 和 notification

```
[logger]
# log level, avaliable level: "debug", "info", "warn", "error", "panic", "fatal"
level = "debug"
name = "clickvisual.log"
```

## Query Failed 9000: i/o timeout

可能原因：DSN 上面有参数配置 read_timeout 参数，可以调整为 max_execution_time 参数，该参数单位是【秒】

参考：
> clickhouse://username:password@host1:9000,host2:9000/database?dial_timeout=200ms&max_execution_time=60


## Kafka 包含不同的json格式(字段不一样) 都需要单独创建吗?

可以选择 JSONAsString 模式创建，但是建立分析字段的时候，会出现很多空数据。

![img.png](../../../images/qa-create-v3.png)

## Kafka 出现消费阻塞

首先看 kafka engine table 的 kafka_format

- JSONAsString，可能是 kafka 数据落地的 MergeTree Table 的物化视图出现了报错；
- JSONEachRow， 可能是 kafka 里面的 json 数据中混入了与表字段不一致的内容；

## ClickVisual 版本更新后菜单不一致

如果出现菜单不一致的情况需要更新 config/resource.yaml 文件  

![img.png](../../../images/qa-menu.png)
