
## 数据采集流程

1. 利用 Fluent Bit 进行数据采集，写入 Kafka
2. ClickHouse 消费 Kafka 将数据写入 Stream 表中
3. 使用 ClickHouse 的 Materialized view 读取 Stream 表，按照自定义规则处理读取到得数据，完成处理后写入 Final log 后可以再管理后台进行查看 

![https://helpcenter.shimonote.com/uploads/0LNQ4VUU01CF2.png](https://helpcenter.shimonote.com/uploads/0LNQ4VUU01CF2.png)

### Fluent Bit 数据采集

按照以下配置开始进行日志数据的采集，包含了原始日志数据和自定义的容器相关数据

fluent-bit.conf
```
[SERVICE]
    Flush         1
    Log_Level     debug
    Daemon        off
    Parsers_File  parsers.conf
    HTTP_Server   On
    HTTP_Listen   0.0.0.0
    HTTP_Port     2020

@INCLUDE input-kubernetes.conf
@INCLUDE filter.conf
@INCLUDE output-kafka.conf

@Set cluster_name=xxx
```

input-kubernetes.conf 
```
[INPUT]
    Name              tail
    Tag               ego.*
    Path              /var/log/containers/*.log
    Exclude_path     *fluent-bit-*,*kube-*,*cattle-system*,*arms-prom*
    Parser            docker
    DB                /var/log/flb_ego.db
    Mem_Buf_Limit     15MB
    Skip_Long_Lines   On
    Buffer_Max_Size   1MB
    Refresh_Interval  10
```

parsers.conf
```
[PARSER]
    Name        docker
    Format      json
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%L
    Time_Keep   On
```

filter.conf
```
[FILTER]
    Name                kubernetes
    Match               ego.*
    Kube_URL            https://kubernetes.default.svc:443
    Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
    Kube_Tag_Prefix     ego.var.log.containers.
    Merge_Log           Off
    Keep_Log            Off
    K8S-Logging.Parser  On
    K8S-Logging.Exclude Off
    Labels              Off
    Annotations         Off

[FILTER]
    Name            modify
    Match           *
    Rename          time _time_
    Rename          stream _source_
    Rename          kubernetes_host _node_name_
    Rename          kubernetes_namespace_name _namespace_
    Rename          kubernetes_container_name _container_name_
    Rename          kubernetes_pod_name _pod_name_
    Remove          kubernetes_pod_id
    Remove          kubernetes_docker_id
    Remove          kubernetes_container_hash
    Remove          kubernetes_container_image
    Add             _cluster_ ${cluster_name}
    Add             _log_agent_ ${HOSTNAME}
    Add             _node_ip_ ${NODE_IP}
```

output-kafka.conf
```
[OUTPUT]
    Name           kafka
    Match          kube.*
    Brokers        127.0.0.1:9092
    Topics         kafka-topic-xxx
    Timestamp_Key  _time_
    Retry_Limit    false
    rdkafka.log.connection.close false
    rdkafka.queue.buffering.max.kbytes 10240
    rdkafka.request.required.acks 1
```

### ClickHouse 消费数据
- app_stdout
- app_stdout_view
- app_stdout_stream

```
create table demo.app_stdout_stream
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
engine = Kafka SETTINGS kafka_broker_list = '127.0.0.1:9092', kafka_topic_list = 'kafka-topic-xxx', kafka_group_name = 'kafka-topic-xxx-group', kafka_format = 'JSONEachRow', kafka_num_consumers = 1;
```

### Materialized View 处理数据
1. 建立数据存储表 app_stdout
```
create table if not exists demo.app_stdout
(
  _time_ DateTime64(3),
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
SETTINGS index_granularity = 8192;
```

2. 建立数据处理视图，将数据从 app_stdout_stream 转入 app_stdout
```
DROP view app_stdout_view;
CREATE MATERIALIZED VIEW app_stdout_view TO app_stdout AS
SELECT
parseDateTimeBestEffortOrNull(_time_) AS _time_,
_source_,
_cluster_,
_log_agent_,
_namespace_,
_node_name_,
_node_ip_,
_container_name_,
_pod_name_,
log AS _raw_log_,
FROM app_stdout_stream where JSONHas(log, 'ts') = 0;
```

mogo 系统展示的就是 app_stdout 中的数据。

## 参考文档
[https://docs.fluentbit.io/manual/](https://docs.fluentbit.io/manual/)
