# 日志库创建模板

## 使用 ego 初始化

`ego` 命令会创建 ClickHouse 实例、`logger` 数据库和日志表模板。运行配置使用真实的 `config/default.toml`，初始化参数使用 `config/init-config.example.toml`：

```bash
./bin/clickvisual ego \
  --config=./config/default.toml \
  --init-config=./config/init-config.example.toml
```

初始化配置是 TOML。ClickHouse DSN 必须通过 `clickhouse_dsn` 或 `--clickhouse-dsn` 提供；Kafka brokers 和 topic 也可在 TOML 或对应 flag 中设置。

### ClickHouse cluster

`cluster` 是 ClickHouse `system.clusters` 中的名称，不是 Kubernetes cluster，也不是节点列表。可以在 TOML 中取消注释：

```toml
clickhouse_dsn = "tcp://localhost:9000?database=default&username=default&password="
# ClickHouse cluster 名称；取消注释后启用集群模式
# cluster = "shard2-repl1"
```

或通过命令行指定（非空 CLI 值优先于 TOML，值会先 TrimSpace）：

```bash
./bin/clickvisual ego --config=./config/default.toml \
  --init-config=./config/init-config.example.toml \
  --cluster=shard2-repl1
```

省略 `cluster` 或传入空值时保持单机模式，且不会查询 `system.clusters`。显式 cluster 会在创建 logger 数据库和日志表之前校验：名称不存在、查询失败，或拓扑为 `1 shard × 1 replica` 时失败；多 shard 或多 replica 的 cluster 可以通过。`--dry-run` 只解析配置并输出摘要，不连接或校验 ClickHouse，也不执行 DDL。DSN 日志仅显示 `configured`/`not configured`，不会回显凭据。

### topic 说明
日志 topic 由初始化 TOML 中的 `topics_app`、`topics_ego`、`topics_ingress_stdout`、`topics_ingress_stderr` 或对应命令行 flag 指定；未指定时使用 ego 内置默认值：

```toml
topics_app = "app-stdout-logs-ilogtail"
topics_ego = "ego-stdout-logs-ilogtail"
topics_ingress_stdout = "ingress-stdout-logs-ilogtail"
topics_ingress_stderr = "ingress-stderr-logs-ilogtail"
```


### 效果
- 创建 ClickHouse 实例记录
- 创建 `logger` 数据库（按可选 cluster 配置创建）
- 创建 app、ego、ingress stdout/stderr 日志表和消费模板
- 写入日志表 metadata 与分析字段


![img.png](../../../images/template_one_1.png)

![img_1.png](../../../images/template_one_2.png)

![img_2.png](../../../images/template_one_3.png)
