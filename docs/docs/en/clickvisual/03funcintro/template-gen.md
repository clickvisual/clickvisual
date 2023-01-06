# Template Generation

## Log collection template for ego framework

### Single machine creation
Note whether the subpath is configured. If the subpath is configured in the environment variable, such as /clickvisual/, you need to replace ` http://127.0.0.1:19001/api/v1/template/1 ` with ` http://127.0.0.1:19001/clickvisual/api/v1/template/1 `
```sh
curl --location --request POST 'http://127.0.0.1:19001/api/v1/template/1' \
--header 'Content-Type: application/json' \
--data-raw '{
    "dsn": "clickhouse://username:password@host1:9000,host2:9000/database?dial_timeout=200ms&max_execution_time=60",
    "clusterName": "clusterName",
    "brokers": "kafka:9092"
}'
```

### No replica cluster creation
Note whether the subpath is configured. If the subpath is configured in the environment variable, such as /clickvisual/, you need to replace ` http://127.0.0.1:19001/api/v1/template/1 ` with ` http://127.0.0.1:19001/clickvisual/api/v1/template/1 `

k8sClusterName is k8s cluster name  
instanceClusterName is ClickHouse cluster
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

### topic 
%s is clusterName for parameter call
```
var kafkaTopicORM = map[string]string{
	"app_stdout":     "app-stdout-logs-%s",
	"ego_stdout":     "ego-stdout-logs-%s",
	"ingress_stdout": "ingress-stdout-logs-%s",
	"ingress_stderr": "ingress-stderr-logs-%s",
}
```


### Results
- Created a clickvisual_default instance
- Created a clickvisual_default database
- Created some log libraries: app-stdout, ego-stdout, ingress-stdout, ingress-stderr
- Created some Analysis fields in log libraries


![img.png](../../../images/template_one_1.png)

![img_1.png](../../../images/template_one_2.png)

![img_2.png](../../../images/template_one_3.png)