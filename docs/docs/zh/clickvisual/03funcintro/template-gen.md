# 日志库创建模板

## 使用 ego 初始化

`ego` 命令会创建或复用 ClickHouse 实例记录，创建 `logger` 数据库和日志表模板。运行配置使用真实的 `config/default.toml`，初始化参数使用 `config/init-config.example.toml`：

```bash
./bin/clickvisual ego \
  --config=./config/default.toml \
  --init-config=./config/init-config.example.toml
```

初始化配置是 TOML。ClickHouse DSN 必须通过 `clickhouse_dsn` 或 `--clickhouse-dsn` 提供；Kafka brokers 和 topic 也可在 TOML 或对应 flag 中设置。

如果已存在名为 `clickhouse-instance` 的实例记录，命令会复用该记录；复用时不会用本次 `clickhouse_dsn` 覆盖已保存的 DSN。

### 通过 API 创建模板

在完整版中，已有数据库时可以调用 API 接口 `POST /api/v2/storage/ego` 创建模板。private-lite 不注册模板创建 API 接口，必须使用 `clickvisual ego` CLI。API 请求需要已认证会话（默认 cookie 名为 `clickvisual_session`）以及目标数据库的编辑权限；如果部署配置了 subpath，请在 URL 中加入该 subpath。API 只在已有数据库上创建模板，不创建实例或数据库，不接收 cluster 参数；cluster 取目标数据库已保存的元数据。实例、`logger` 数据库创建以及 cluster 预校验由 CLI `ego` 流程负责。

CLI/TOML 中省略四个 topic 时，`CmdFunc` 会补上内置默认值；API 接口的四个 topic 字段均为必填，接口不会补默认值。`topicsEgo` 与 `topicsIngressStderr` 是 API 必填兼容字段，但当前模板服务不使用它们，也不会创建对应表。

```bash
curl --location --request POST 'http://127.0.0.1:19001/api/v2/storage/ego' \
  --cookie 'clickvisual_session=<session-cookie>' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "brokers": "kafka:9092",
    "databaseId": 1,
    "topicsApp": "app-stdout-logs-ilogtail",
    "topicsEgo": "ego-stdout-logs-ilogtail",
    "topicsIngressStdout": "ingress-stdout-logs-ilogtail",
    "topicsIngressStderr": "ingress-stderr-logs-ilogtail"
  }'
```

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
日志 topic 由初始化 TOML 中的 `topics_app`、`topics_ego`、`topics_ingress_stdout`、`topics_ingress_stderr` 或对应命令行 flag 指定；当前模板服务使用 `topics_app` 和 `topics_ingress_stdout` 创建 app stdout、ingress stdout 表。CLI/TOML 中未指定时使用 ego 内置默认值；API 接口不会补默认值，四个字段都必须传入非空值。JSON 中的 `topicsEgo` 与 `topicsIngressStderr` 是 API 必填兼容字段，但当前模板服务不使用它们，也不会创建对应表：

```toml
topics_app = "app-stdout-logs-ilogtail"
topics_ego = "ego-stdout-logs-ilogtail"
topics_ingress_stdout = "ingress-stdout-logs-ilogtail"
topics_ingress_stderr = "ingress-stderr-logs-ilogtail"
```


### 效果
- 创建或复用 ClickHouse 实例记录
- 创建 `logger` 数据库（按可选 cluster 配置创建）
- 创建 app stdout、ingress stdout 日志表和消费模板
- 写入日志表 metadata 与分析字段
