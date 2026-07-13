# SQLite private-lite 部署

本文说明如何使用 SQLite 作为 ClickVisual metadata 数据库启动 private-lite 版本。该模式适合私有化轻量部署、演示环境和只需要 v2 日志查询能力的场景。

## 能力边界

SQLite 只替代 ClickVisual 的 metadata 数据库，用来保存用户、实例、数据库、日志表、查询配置等管理数据。

日志数据仍写入 ClickHouse，日志采集和日志表模板仍依赖 Kafka、ClickHouse 和 `ego` 初始化流程。也就是说，SQLite 模式可以不依赖 MySQL 启动服务，但不能替代 ClickHouse 存储日志。

private-lite 版本只保留 v2 日志查询相关能力，不启用完整版本中的报表、告警、数据接入发布等模块。

## 配置示例

仓库内提供了示例配置：

```text
config/private-lite-sqlite.toml
```

关键配置如下：

```toml
[app]
v2Edition = "private-lite"
rootURL = "http://localhost:19083"
serveFromSubPath = false

[server.http]
host = "127.0.0.1"
port = 19083

[metadata]
driver = "sqlite"
dsn = "data/clickvisual-private-lite.db"
debug = true

[mysql]
dsn = ""

[auth]
mode = "memstore"
name = "clickvisual_session_sqlite"
```

如果部署在子路径，例如 `/clickvisual`，需要同时修改：

```toml
[app]
rootURL = "http://localhost:19083/clickvisual"
serveFromSubPath = true
```

容器内运行时需要把 `server.http.host` 和 `server.governor.host` 改为 `0.0.0.0`，否则只能在容器内部访问。

## 启动服务

首次启动前确保 SQLite 文件所在目录存在：

```bash
mkdir -p data
```

本机二进制启动：

```bash
./bin/clickvisual server --config=config/private-lite-sqlite.toml
```

服务启动时如果检测到：

```toml
[metadata]
driver = "sqlite"
```

会自动初始化 SQLite metadata schema，不需要提前手动创建 SQLite 表。

默认访问地址：

```text
http://localhost:19083/v2
```

如果启用了子路径：

```text
http://localhost:19083/clickvisual/v2
```

默认登录账号和密码：

```text
username: clickvisual
password: clickvisual
```

生产环境请在首次登录后修改默认密码。

## 初始化日志库和日志表

SQLite schema 初始化只负责 ClickVisual metadata 表。要创建 ClickHouse 实例、`logger` 数据库和 ego 日志表模板，需要执行 `ego` 初始化命令。

本机执行示例：

```bash
./bin/clickvisual ego \
  --config=config/private-lite-sqlite.toml \
  --clickhouse-dsn="tcp://127.0.0.1:9000?database=default&username=root&password=shimo" \
  --brokers="127.0.0.1:9092" \
  --topics-app="app-stdout-logs" \
  --topics-ingress-stdout="ingress-stdout-logs"
```

Docker 网络内执行示例：

```bash
docker exec -it clickvisual sh -c './bin/clickvisual ego \
  --config=/clickvisual/config/private-lite-sqlite.toml \
  --clickhouse-dsn="tcp://clickhouse:9000?database=default&username=root&password=shimo" \
  --brokers="kafka:9092" \
  --topics-app="app-stdout-logs" \
  --topics-ingress-stdout="ingress-stdout-logs"'
```

如果 Kafka 对容器内部暴露的是 `29092`，则将 `--brokers` 改成：

```text
kafka:29092
```

`ego` 初始化会完成以下操作：

- 创建 ClickHouse 实例记录；
- 创建 `logger` 数据库；
- 根据 Kafka topic 创建日志表和消费模板；
- 将日志表 metadata 写入 SQLite。

## 写入 mock 数据

可以使用 Kafka console producer 写入一条应用日志：

```bash
printf '%s\n' \
'{"contents":{"_source_":"stdout","_time_":"2026-07-09T16:00:01.000000000+08:00","content":"cv-mock sqlite private-lite app log"},"tags":{"container.name":"app-server","k8s.namespace.name":"default","k8s.pod.name":"demo-app-001"},"time":1783584001}' \
| docker exec -i kafka /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka:9092 \
  --topic app-stdout-logs
```

写入后可以在 ClickHouse 中验证：

```bash
clickhouse-client --user root --password shimo \
  --query "SELECT count() FROM logger.app_stdout WHERE _raw_log_ LIKE '%cv-mock sqlite private-lite%'"
```

前端查询时选择：

```text
database: logger
table: app_stdout
```

并添加条件：

```text
_raw_log_ contains cv-mock sqlite private-lite
```

## 常见问题

### 启动后仍然访问 MySQL

确认配置中已经设置：

```toml
[metadata]
driver = "sqlite"
dsn = "data/clickvisual-private-lite.db"

[mysql]
dsn = ""
```

同时确认启动命令使用的是 SQLite 配置文件：

```bash
./bin/clickvisual server --config=config/private-lite-sqlite.toml
```

### `lookup clickhouse on ... no such host`

这是 Docker 网络问题。执行 `ego` 初始化的 ClickVisual 容器必须和 ClickHouse、Kafka 在同一个 Docker network。

可以把 ClickVisual 容器接入同一个网络：

```bash
docker network connect <network-name> clickvisual
```

然后验证 DNS：

```bash
docker exec clickvisual getent hosts clickhouse
docker exec clickvisual getent hosts kafka
```

### `/clickvisual/v2/login` 返回 404

如果使用 `/clickvisual` 子路径访问，需要配置：

```toml
[app]
rootURL = "http://localhost:19083/clickvisual"
serveFromSubPath = true
```

仅前端构建时设置 public path 不会让后端自动挂载 `/clickvisual` 路径，后端运行时配置也必须开启子路径。
