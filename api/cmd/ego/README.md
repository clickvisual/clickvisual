# ClickVisual Ego 命令

## 功能

1. **创建 ClickHouse 实例** - 调用 `base.InstanceCreate` 接口创建 ClickHouse 实例，支持多节点情况
2. **创建 logger 数据库** - 在创建的实例上调用 `base.DatabaseCreate` 创建名为 "logger" 的数据库
3. **创建 ego 存储模板** - 在 logger 数据库上调用 `storage.CreateStorageByTemplate` 创建 ego 存储模板

## 使用方法

### 配置文件方式

```bash
# 使用配置文件
./clickvisual ego --init-config ./configs/init-config.example.toml --config=./configs/local.toml 
```

## 参数说明

| 参数 | 短参数 | 必需 | 说明 |
|------|--------|------|------|
| `--init-config` | `-i` | 否 | 初始化配置文件路径 |
| `--clickhouse-dsn` | `-d` | 否 | ClickHouse DSN 连接字符串（有默认值） |
| `--brokers` | `-b` | 否 | Kafka brokers 地址（有默认值） |
| `--topics-app` | | 否 | 应用日志 topic（有默认值） |
| `--topics-ego` | | 否 | Ego 日志 topic（有默认值） |
| `--topics-ingress-stdout` | | 否 | Ingress stdout topic（有默认值） |
| `--topics-ingress-stderr` | | 否 | Ingress stderr topic（有默认值） |
| `--dry-run` | | 否 | 只解析配置，不执行实际操作 |

## 配置文件格式

配置文件支持简单的 key=value 格式：

```yaml
# ClickHouse 连接配置
clickhouse_dsn=tcp://localhost:9000?database=default&username=default&password=

# Kafka 配置
brokers=localhost:9092

# Topic 配置
topics_app=app-logs
topics_ego=ego-logs
topics_ingress_stdout=ingress-stdout
topics_ingress_stderr=ingress-stderr
```

## 默认值

如果未提供参数，系统会使用以下默认值：

- **ClickHouse DSN**: `tcp://localhost:9000?database=default&username=default&password=`
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
