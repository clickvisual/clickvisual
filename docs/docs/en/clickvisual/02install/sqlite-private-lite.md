# SQLite Private-Lite Deployment

This document describes how to run ClickVisual private-lite with SQLite as the metadata database. This mode is suitable for lightweight private deployments, demos, and environments that only need v2 log query capabilities.

## Scope

SQLite only replaces the ClickVisual metadata database. It stores management data such as users, instances, databases, log tables, and query configuration.

Log data is still stored in ClickHouse. Log ingestion and log table templates still depend on Kafka, ClickHouse, and the `ego` initialization flow. In other words, SQLite mode allows the service to start without MySQL, but it does not replace ClickHouse for log storage.

The private-lite edition keeps only v2 log query related capabilities. Full edition modules such as reports, alerts, and ingestion publishing are not enabled.

## Configuration

The repository provides this example configuration:

```text
config/private-lite-sqlite.toml
```

Key settings:

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

When deploying under a subpath such as `/clickvisual`, update both settings:

```toml
[app]
rootURL = "http://localhost:19083/clickvisual"
serveFromSubPath = true
```

When running inside a container, change `server.http.host` and `server.governor.host` to `0.0.0.0`; otherwise, the service is only reachable from inside the container.

## Start the Service

Make sure the SQLite database directory exists before the first start:

```bash
mkdir -p data
```

Start with a local binary:

```bash
./bin/clickvisual server --config=config/private-lite-sqlite.toml
```

When the service detects:

```toml
[metadata]
driver = "sqlite"
```

it automatically initializes the SQLite metadata schema during startup. You do not need to create SQLite tables manually.

Default URL:

```text
http://localhost:19083/v2
```

When subpath deployment is enabled:

```text
http://localhost:19083/clickvisual/v2
```

Default login:

```text
username: clickvisual
password: clickvisual
```

Change the default password after the first login in production environments.

## Initialize Log Database and Tables

SQLite schema initialization only creates ClickVisual metadata tables. To create the ClickHouse instance, the `logger` database, and ego log table templates, run the `ego` initialization command.

Local example:

```bash
./bin/clickvisual ego \
  --config=config/private-lite-sqlite.toml \
  --clickhouse-dsn="tcp://127.0.0.1:9000?database=default&username=root&password=shimo" \
  --brokers="127.0.0.1:9092" \
  --topics-app="app-stdout-logs" \
  --topics-ingress-stdout="ingress-stdout-logs"
```

Docker network example:

```bash
docker exec -it clickvisual sh -c './bin/clickvisual ego \
  --config=/clickvisual/config/private-lite-sqlite.toml \
  --clickhouse-dsn="tcp://clickhouse:9000?database=default&username=root&password=shimo" \
  --brokers="kafka:9092" \
  --topics-app="app-stdout-logs" \
  --topics-ingress-stdout="ingress-stdout-logs"'
```

If Kafka exposes `29092` inside the Docker network, set `--brokers` to:

```text
kafka:29092
```

The `ego` initialization command:

- creates the ClickHouse instance record;
- creates the `logger` database;
- creates log tables and consumption templates from Kafka topics;
- writes log table metadata into SQLite.

## Write Mock Data

Use Kafka console producer to write one application log:

```bash
printf '%s\n' \
'{"contents":{"_source_":"stdout","_time_":"2026-07-09T16:00:01.000000000+08:00","content":"cv-mock sqlite private-lite app log"},"tags":{"container.name":"app-server","k8s.namespace.name":"default","k8s.pod.name":"demo-app-001"},"time":1783584001}' \
| docker exec -i kafka /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka:9092 \
  --topic app-stdout-logs
```

Verify in ClickHouse:

```bash
clickhouse-client --user root --password shimo \
  --query "SELECT count() FROM logger.app_stdout WHERE _raw_log_ LIKE '%cv-mock sqlite private-lite%'"
```

In the frontend, select:

```text
database: logger
table: app_stdout
```

Add this condition:

```text
_raw_log_ contains cv-mock sqlite private-lite
```

## FAQ

### The service still tries to use MySQL

Check that the configuration includes:

```toml
[metadata]
driver = "sqlite"
dsn = "data/clickvisual-private-lite.db"

[mysql]
dsn = ""
```

Also make sure the service is started with the SQLite configuration file:

```bash
./bin/clickvisual server --config=config/private-lite-sqlite.toml
```

### `lookup clickhouse on ... no such host`

This is a Docker network issue. The ClickVisual container that runs `ego` initialization must be in the same Docker network as ClickHouse and Kafka.

Connect the ClickVisual container to the same network:

```bash
docker network connect <network-name> clickvisual
```

Verify DNS:

```bash
docker exec clickvisual getent hosts clickhouse
docker exec clickvisual getent hosts kafka
```

### `/clickvisual/v2/login` returns 404

When using the `/clickvisual` subpath, configure:

```toml
[app]
rootURL = "http://localhost:19083/clickvisual"
serveFromSubPath = true
```

Setting the frontend public path alone does not make the backend serve `/clickvisual`. The backend runtime configuration must also enable subpath serving.
