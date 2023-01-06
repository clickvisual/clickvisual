# 日志库创建模板

## 对 EGO 框架日志采集模板

### 单机创建
注意是否配置了 subpath，如果环境变量中配置了子路径例如 /clickvisual/ 则需要从
`http://127.0.0.1:19001/api/v1/template/1` 替换为 `http://127.0.0.1:19001/clickvisual/api/v1/template/1`
```sh
curl --location --request POST 'http://127.0.0.1:19001/api/v1/template/1' \
--header 'Content-Type: application/json' \
--data-raw '{
    "dsn": "clickhouse://username:password@host1:9000,host2:9000/database?dial_timeout=200ms&max_execution_time=60",
    "clusterName": "clusterName",
    "brokers": "kafka:9092"
}'
```

### 无副本集群创建
注意是否配置了 subpath，如果环境变量中配置了子路径例如 /clickvisual/ 则需要从
`http://127.0.0.1:19001/api/v1/template/1` 替换为 `http://127.0.0.1:19001/clickvisual/api/v1/template/1`

k8sClusterName 为 k8s 集群的名称  
instanceClusterName 为 ClickHouse 的 cluster
```sh
curl --location --request POST 'http://127.0.0.1:19001/api/v1/template/1' \
--header 'Content-Type: application/json' \
--data-raw '{
    "dsn": "clickhouse://username:password@host1:9000,host2:9000/database?dial_timeout=200ms&max_execution_time=60",
    "k8sClusterName": "clusterName", 
    "brokers": "kafka:9092",
    "instanceClusterName": "shard2-repl1"
}'
```

### topic 说明
%s 为参数调用中的 clusterName
```
var kafkaTopicORM = map[string]string{
	"app_stdout":     "app-stdout-logs-%s",
	"ego_stdout":     "ego-stdout-logs-%s",
	"ingress_stdout": "ingress-stdout-logs-%s",
	"ingress_stderr": "ingress-stderr-logs-%s",
}
```


### 效果
- 创建 clickvisual_default 的实例
- 创建 clickvisual_default 的数据库
- 创建 app-stdout, ego-stdout, ingress-stdout, ingress-stderr 日志库
- 创建日志库中的分析字段


![img.png](../../../images/template_one_1.png)

![img_1.png](../../../images/template_one_2.png)

![img_2.png](../../../images/template_one_3.png)