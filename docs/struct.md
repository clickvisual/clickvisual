## 数据表初始化

### 业务日志

data table 
```clickhouse
create table if not exists nocnoc_dev.app_stdout
(
	_time_ DateTime64(6),
	_source_ String,
	_cluster_ String,
	_log_agent_ String,
	_namespace_ String,
	_node_name_ String,
	_node_ip_ String,
	_container_name_ String,
	_pod_name_ String,
	_raw_log_ String
)
engine = MergeTree PARTITION BY toYYYYMMDD(_time_)
ORDER BY _time_
TTL _time_ + INTERVAL 3 MONTH 
SETTINGS index_granularity = 8192;
```

stream table
```clickhouse
create table if not exists nocnoc_dev.app_stdout_stream
(
	log String,
	_source_ String,
	_time_ String,
	_pod_name_ String,
	_namespace_ String,
	_node_name_ String,
	_container_name_ String,
	_cluster_ String,
	_log_agent_ String,
	_node_ip_ String
)
engine = Kafka SETTINGS kafka_broker_list = '10.130.157.53:9092', kafka_topic_list = 'app-stdout-nocdev', kafka_group_name = 'app-stdout-group-nocdev', kafka_format = 'JSONEachRow', kafka_num_consumers = 1;

```