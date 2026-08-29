# Template Generation

## Initialize ego log templates

The `ego` command creates or reuses the ClickHouse instance record, creates the `logger` database, and creates the log table templates. Use the repository's runtime config and init TOML file:

```bash
./bin/clickvisual ego \
  --config=./config/default.toml \
  --init-config=./config/init-config.example.toml
```

The init file is TOML. Provide the ClickHouse DSN with `clickhouse_dsn` or `--clickhouse-dsn`; Kafka brokers and topics can likewise be set in TOML or with their flags.

If a `clickhouse-instance` record already exists, ego reuses it; reuse does not overwrite the stored DSN with the `clickhouse_dsn` from this run.

### Create templates through the API

In the full edition, call the API endpoint `POST /api/v2/storage/ego` for an existing database. The private-lite edition does not register the storage-creation API; use the `clickvisual ego` CLI instead. The API request requires an authenticated session (the default cookie name is `clickvisual_session`) and edit permission on the target database. If the deployment uses a subpath, include that subpath in the URL. The API creates templates only in an existing database: it does not create an instance or database, does not accept a cluster parameter, and uses the cluster metadata already stored on the target database. The CLI `ego` flow is responsible for creating or reusing the instance, creating the `logger` database, and performing cluster pre-validation.

When the four topics are omitted in CLI/TOML configuration, `CmdFunc` supplies the built-in defaults. All four topic fields are `required` in the full-edition API JSON body; the API does not supply defaults, so each must be non-empty. `topicsEgo` and `topicsIngressStderr` are compatibility fields required by the API, but the current template service does not use them or create their tables.

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

`cluster` is a name from ClickHouse `system.clusters`. It is not a Kubernetes cluster name or a node list. Uncomment it in TOML when cluster mode is needed:

```toml
clickhouse_dsn = "tcp://localhost:9000?database=default&username=default&password="
# ClickHouse cluster name; uncomment to enable cluster mode
# cluster = "shard2-repl1"
```

Or pass it on the command line (a non-empty CLI value wins over TOML, after trimming surrounding whitespace):

```bash
./bin/clickvisual ego --config=./config/default.toml \
  --init-config=./config/init-config.example.toml \
  --cluster=shard2-repl1
```

If `cluster` is omitted or empty, ego remains in standalone mode and does not query `system.clusters`. An explicit cluster is validated before the logger database and tables are created: an unknown name, query error, or `1 shard × 1 replica` topology fails; a cluster with multiple shards or multiple replicas passes. `--dry-run` only parses configuration and prints a summary—no ClickHouse connection or validation and no DDL are performed. DSN logs show only `configured` or `not configured`, never credentials.

### Topics
Log topics come from `topics_app`, `topics_ego`, `topics_ingress_stdout`, and `topics_ingress_stderr` in the init TOML or from the corresponding command-line flags. The current template service uses `topics_app` and `topics_ingress_stdout` to create the app stdout and ingress stdout tables. When omitted in CLI/TOML configuration, ego supplies the built-in defaults; the API endpoint does not supply defaults and requires all four fields to be non-empty. The JSON fields `topicsEgo` and `topicsIngressStderr` are compatibility fields required by the API, but the current service does not use them or create those tables.

```toml
topics_app = "app-stdout-logs-ilogtail"
topics_ego = "ego-stdout-logs-ilogtail"
topics_ingress_stdout = "ingress-stdout-logs-ilogtail"
topics_ingress_stderr = "ingress-stderr-logs-ilogtail"
```


### Results
- Created or reused a ClickHouse instance record
- Created the `logger` database (using the optional cluster setting)
- Created app stdout and ingress stdout log tables and consumption templates
- Wrote log-table metadata and analysis fields
