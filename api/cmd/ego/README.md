# ClickVisual Ego 命令

## 功能

1. **创建 ClickHouse 实例** - 调用 `base.InstanceCreate` 接口创建 ClickHouse 实例
2. **创建 logger 数据库** - 在创建的实例上调用 `base.DatabaseCreate` 创建名为 "logger" 的数据库
3. **创建 ego 存储模板** - 在 logger 数据库上调用 `storage.CreateStorageByTemplate` 创建 ego 存储模板

## 使用方法

### 配置文件方式

```bash
# 使用仓库中的运行配置和 ego 初始化配置
./clickvisual ego \
  --config=./config/default.toml \
  --init-config=./config/init-config.example.toml
```

`--init-config` 是 TOML 文件；ClickHouse DSN、Kafka brokers 和 topic 等初始化参数可写在该文件中，也可通过命令行参数传入。命令行传入的非空值优先于 TOML 值；`cluster` 会先执行 TrimSpace，再进行判断。

## 参数说明

| 参数 | 短参数 | 必需 | 说明 |
|------|--------|------|------|
| `--init-config` | `-i` | 否 | 初始化配置文件路径 |
| `--clickhouse-dsn` | `-d` | 否 | ClickHouse DSN 连接字符串（必须通过 CLI 或 TOML 提供） |
| `--cluster` | | 否 | ClickHouse `system.clusters` 中的 cluster 名称；配置后启用集群模式 |
| `--brokers` | `-b` | 否 | Kafka brokers 地址（有默认值） |
| `--topics-app` | | 否 | 应用日志 topic（有默认值） |
| `--topics-ego` | | 否 | Ego 日志 topic（有默认值） |
| `--topics-ingress-stdout` | | 否 | Ingress stdout topic（有默认值） |
| `--topics-ingress-stderr` | | 否 | Ingress stderr topic（有默认值） |
| `--dry-run` | | 否 | 只解析配置，不执行实际操作 |

## 配置文件格式

`config/init-config.example.toml` 是可直接复制的 TOML 示例：

```toml
clickhouse_dsn = "tcp://localhost:9000?database=default&username=default&password="
# ClickHouse cluster 名称；取消注释后启用集群模式
# cluster = "shard2-repl1"
brokers = ["kafka-service.default:9092"]
topics_app = "app-stdout-logs-ilogtail"
topics_ego = "ego-stdout-logs-ilogtail"
topics_ingress_stdout = "ingress-stdout-logs-ilogtail"
topics_ingress_stderr = "ingress-stderr-logs-ilogtail"
```

`cluster` 必须是 ClickHouse `system.clusters` 中的名称，不是 Kubernetes cluster 名称，也不是节点地址列表。省略或传入空白值时保持单机模式，且不会查询 `system.clusters`。显式配置 cluster 后，ego 会在创建 logger 数据库和日志表之前校验：名称不存在、查询失败，或拓扑为 `1 shard × 1 replica` 都会失败；多 shard 或多 replica 的 cluster 可以通过。

使用 `--cluster` 传入时，非空 CLI 值优先于 TOML 中的 `cluster`：

```bash
./clickvisual ego --config=./config/default.toml \
  --init-config=./config/init-config.example.toml \
  --cluster=shard2-repl1
```

## 默认值

如果未提供参数，系统会使用以下默认值：

- **ClickHouse DSN**: 必须通过 `--clickhouse-dsn` 或 `clickhouse_dsn` 配置
- **Kafka Brokers**: `kafka-service.default:9092`
- **Topics App**: `app-stdout-logs-ilogtail`
- **Topics Ego**: `ego-stdout-logs-ilogtail`
- **Topics Ingress Stdout**: `ingress-stdout-logs-ilogtail`
- **Topics Ingress Stderr**: `ingress-stderr-logs-ilogtail`

## 日志输出

命令执行过程中会输出详细的日志信息：

```
[INFO] 开始初始化 ClickVisual...
[INFO] 创建 ClickHouse 实例...
[INFO] ClickHouse 实例创建成功 ID=1
[INFO] 创建 logger 数据库...
[INFO] logger 数据库创建成功 ID=1
[INFO] 创建 ego 存储模板...
[INFO] ego 存储模板创建成功
[INFO] ClickVisual 初始化完成
```

为避免泄露凭据，DSN 日志只显示 `configured` 或 `not configured`，不会回显 DSN 内容。使用 `--dry-run` 时只解析配置并输出摘要，不连接或校验 ClickHouse，也不执行 DDL。
