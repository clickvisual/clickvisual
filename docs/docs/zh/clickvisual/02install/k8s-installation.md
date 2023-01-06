# K8s 集群安装

本文主要介绍如何使用 helm 或 kubectl 将 clickvisual 部署到 Kubernetes 集群。

## 1. 部署要求
- Kubernetes >= 1.17
- Helm >= 3.0.0

## 2. 日志采集
选择其中一个工具采集日志即可。

### 2.1 部署 fluent-bit（参考）
可以直接参考 fluent-bit 官方网站进行部署，只需要保证，写入 kafka 的数据包含以下两个字段即可。
- `_time_`
- `_log_`

[https://docs.fluentbit.io/manual/installation/kubernetes#installation](https://docs.fluentbit.io/manual/installation/kubernetes#installation)

Fluent Bit Kubernetes Daemonset 
[https://github.com/fluent/fluent-bit-kubernetes-logging](https://github.com/fluent/fluent-bit-kubernetes-logging)

挂载的 fluentbit-configmap.yaml 配置可以参考如下：
``` 
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-system
  labels:
    k8s-app: fluent-bit
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    @INCLUDE input-kubernetes.conf
    @INCLUDE filter-kubernetes.conf
    @INCLUDE filter-modify.conf
    @INCLUDE output-kafka.conf

    # DaemonSet中有配置ENV时禁用
    #@Set CLUSTER_NAME=shimodev
    #@Set KAFKA_BROKERS=127.0.0.1:9092

  input-kubernetes.conf: |
    [INPUT]
        Name              tail
        # Tag 标识数据源，用于后续处理流程Filter,output时选择数据
        Tag               ingress.*
        Path              /var/log/containers/nginx-ingress-controller*.log
        Parser            docker
        DB                /var/log/flb_ingress.db
        Mem_Buf_Limit     15MB
        Buffer_Chunk_Size 32k
        Buffer_Max_Size   64k
        # 跳过长度大于 Buffer_Max_Size 的行，Skip_Long_Lines 若设为Off遇到超过长度的行会停止采集
        Skip_Long_Lines   On
        Refresh_Interval  10
        # 采集文件没有数据库偏移位置记录的，从文件的头部开始读取，日志文件较大时会导致fluent内存占用率升高出现oomkill
        #Read_from_Head    On

    [INPUT]
        Name              tail
        # Tag 标识数据源，用于后续处理流程Filter,output时选择数据
        Tag               ingress_stderr.*
        Path              /var/log/containers/nginx-ingress-controller*.log
        Parser            docker
        DB                /var/log/flb_ingress_stderr.db
        Mem_Buf_Limit     15MB
        Buffer_Chunk_Size 32k
        Buffer_Max_Size   64k
        # 跳过长度大于 Buffer_Max_Size 的行，Skip_Long_Lines 若设为Off遇到超过长度的行会停止采集
        Skip_Long_Lines   On
        Refresh_Interval  10
        # 采集文件没有数据库偏移位置记录的，从文件的头部开始读取，日志文件较大时会导致fluent内存占用率升高出现oomkill
        #Read_from_Head    On

    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*_default_*.log,/var/log/containers/*_release_*.log
        Exclude_path     *fluent-bit-*,*mongo-*,*minio-*,*mysql-*
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     15MB
        Buffer_Chunk_Size 1MB
        Buffer_Max_Size   5MB
        # 跳过长度大于 Buffer_Max_Size 的行，Skip_Long_Lines 若设为Off遇到超过长度的行会停止采集
        Skip_Long_Lines   On
        Refresh_Interval  10

    [INPUT]
        Name              tail
        Tag               ego.*
        Path              /var/log/containers/*_default_*.log,/var/log/containers/*_release_*.log
        Exclude_path     *fluent-bit-*,*mongo-*,*minio-*,*mysql-*
        Parser            docker
        DB                /var/log/flb_ego.db
        Mem_Buf_Limit     15MB
        Buffer_Chunk_Size 1MB
        Buffer_Max_Size   5MB
        Skip_Long_Lines   On
        Refresh_Interval  10

  filter-kubernetes.conf: |
    [FILTER]
        Name                kubernetes
        Match               ingress.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     ingress.var.log.containers.
        # Merge_Log=On 解析log字段的json内容，提取到根层级, 附加到Merge_Log_Key指定的字段上.
        Merge_Log           Off
        #Merge_Log_Key       log_processed
        #Merge_Log_Trim      On
        # 合并log字段后是否保持原始log字段
        Keep_Log            On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off
        Labels              Off
        Annotations         Off
        #Regex_Parser

    [FILTER]
        Name                kubernetes
        Match               ingress_stderr.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     ingress_stderr.var.log.containers.
        # Merge_Log=On 解析log字段的json内容，提取到根层级, 附加到Merge_Log_Key指定的字段上.
        Merge_Log           Off
        # 合并log字段后是否保持原始log字段
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off
        Labels              Off
        Annotations         Off
        #Regex_Parser


    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           Off
        Keep_Log            On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off
        Labels              Off
        Annotations         Off

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



  filter-modify.conf: |
    [FILTER]
        Name         nest
        Match        *
        Wildcard     pod_name
        Operation    lift
        Nested_under kubernetes
        Add_prefix   kubernetes_

    [FILTER]
        Name            modify
        Match           *
        #Rename          time _time_
        Rename          log _log_
        Rename          stream _source_
        Rename          kubernetes_host _node_name_
        Rename          kubernetes_namespace_name _namespace_
        Rename          kubernetes_container_name _container_name_
        Rename          kubernetes_pod_name _pod_name_
        Remove          kubernetes_pod_id
        Remove          kubernetes_docker_id
        Remove          kubernetes_container_hash
        Remove          kubernetes_container_image
        Add             _cluster_ ${CLUSTER_NAME}
        Add             _log_agent_ ${HOSTNAME}
        # ${NODE_IP} 通过daemonset中配置ENV注入
        Add             _node_ip_ ${NODE_IP}

    [FILTER]
        Name    grep
        Match   ingress.*
        #Regex container_name ^nginx-ingress-controller$
        #Regex stream ^stdout$
        Exclude _source_ ^stderr$
        # 排除 TCP 代理日志（日志格式不同影响采集）
        Exclude _log_ ^\[*

    [FILTER]
        Name    grep
        Match   ingress_stderr.*
        Exclude _source_ ^stdout$

    [FILTER]
        Name    grep
        Match   kube.*
        #Regex stream ^stdout$
        Exclude _log_ (ego.sys)

    [FILTER]
        Name    grep
        Match   ego.*
        #Regex lname ^(ego.sys)$
        Regex   _log_ ("lname":"ego.sys")

    # [FILTER]
    #     Name            modify
    #     Match           ego.*
    #     Hard_rename     ts _time_

  output-kafka.conf: |
    [OUTPUT]
        Name           kafka
        Match          ingress.*
        Brokers        ${KAFKA_BROKERS}
        Topics         ingress-stdout-logs-${CLUSTER_NAME}
        #Timestamp_Key  @timestamp
        Timestamp_Key  _time_
        Timestamp_Format  iso8601
        Retry_Limit    false
        # hides errors "Receive failed: Disconnected" when kafka kills idle connections
        rdkafka.log.connection.close false
        # producer buffer is not included in http://fluentbit.io/documentation/0.12/configuration/memory_usage.html#estimating
        rdkafka.queue.buffering.max.kbytes 10240
        # for logs you'll probably want this ot be 0 or 1, not more
        rdkafka.request.required.acks 1

    [OUTPUT]
        Name           kafka
        Match          ingress_stderr.*
        Brokers        ${KAFKA_BROKERS}
        Topics         ingress-stderr-logs-${CLUSTER_NAME}
        #Timestamp_Key  @timestamp
        Timestamp_Key  _time_
        Timestamp_Format  iso8601
        Retry_Limit    false
        # hides errors "Receive failed: Disconnected" when kafka kills idle connections
        rdkafka.log.connection.close false
        # producer buffer is not included in http://fluentbit.io/documentation/0.12/configuration/memory_usage.html#estimating
        rdkafka.queue.buffering.max.kbytes 10240
        # for logs you'll probably want this ot be 0 or 1, not more
        rdkafka.request.required.acks 1

    [OUTPUT]
        Name           kafka
        Match          kube.*
        Brokers        ${KAFKA_BROKERS}
        Topics         app-stdout-logs-${CLUSTER_NAME}
        Timestamp_Key  _time_
        Timestamp_Format  iso8601
        Retry_Limit    false
        # hides errors "Receive failed: Disconnected" when kafka kills idle connections
        rdkafka.log.connection.close false
        # producer buffer is not included in http://fluentbit.io/documentation/0.12/configuration/memory_usage.html#estimating
        rdkafka.queue.buffering.max.kbytes 10240
        # for logs you'll probably want this ot be 0 or 1, not more
        rdkafka.request.required.acks 1

    [OUTPUT]
        Name           kafka
        Match          ego.*
        Brokers        ${KAFKA_BROKERS}
        Topics         ego-stdout-logs-${CLUSTER_NAME}
        Timestamp_Key  _time_
        Timestamp_Format  iso8601
        Retry_Limit    false
        # hides errors "Receive failed: Disconnected" when kafka kills idle connections
        rdkafka.log.connection.close false
        # producer buffer is not included in http://fluentbit.io/documentation/0.12/configuration/memory_usage.html#estimating
        rdkafka.queue.buffering.max.kbytes 10240
        # for logs you'll probably want this ot be 0 or 1, not more
        rdkafka.request.required.acks 1

  parsers.conf: |
    [PARSER]
        Name   apache
        Format regex
        Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name   apache2
        Format regex
        Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name   apache_error
        Format regex
        Regex  ^\[[^ ]* (?<time>[^\]]*)\] \[(?<level>[^\]]*)\](?: \[pid (?<pid>[^\]]*)\])?( \[client (?<client>[^\]]*)\])? (?<message>.*)$

    [PARSER]
        Name   nginx
        Format regex
        Regex ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name   json
        Format json
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
        Time_Keep   On
        # 与FILTER 阶段中Merge_Log=On 效果类似，解析log字段的json内容，但无法提到根层级
        #Decode_Field_As escaped_utf8 kubernetes do_next
        #Decode_Field_As json kubernetes

    [PARSER]
        # http://rubular.com/r/tjUt3Awgg4
        Name cri
        Format regex
        Regex ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<message>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z

    [PARSER]
        Name        syslog
        Format      regex
        Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
        Time_Key    time
        Time_Format %b %d %H:%M:%S
```

### 2.2 loggie-io

https://github.com/loggie-io/loggie

## 3. 部署 clickvisual
   克隆仓库：

```
git clone https://github.com/clickvisual/clickvisual.git
```

### 3.1 使用自定义配置

```
cd clickvisual && cp config/default.toml data/helm/clickvisual/default.toml
```
修改 data/helm/clickvisual/default.toml 中的 mysql、auth 以及其他段配置，将 mysql.dsn 、 auth.redisAddr、auth.redisPassword 替换为你自己的配置。

修改 data/helm/clickvisual/templates/deployment.yaml 中 value 为 `configs/default.toml` 默认是 `config/default.toml` 即仓库中的默认配置
```
- name: EGO_CONFIG_PATH
value: "configs/default.toml"
```

### 3.2 安装
方法一：[推荐] 使用 helm 直接安装：
```
helm install clickvisual data/helm/clickvisual --set image.tag=latest --namespace default
```
如果你已将 clickvisual 镜像推送到你自己的 harbor 仓库，可以通过 --set image.respository 指令修改仓库地址
```
helm install clickvisual data/helm/clickvisual --set image.repository=${YOUR_HARBOR}/${PATH}/clickvisual --set image.tag=latest --namespace default
```

方法二：[可选] 使用 helm 渲染出 yaml 后，手动通过 kubectl 安装：
```
# 使用 helm template 指令渲染安装的 yaml
helm template clickvisual data/helm/clickvisual --set image.tag=latest > clickvisual.yaml

# 可以使用 "--set image.repository" 来覆盖默认镜像路径
# helm template clickvisual clickvisual --set image.repository=${YOUR_HARBOR}/${PATH}/clickvisual --set image.tag=latest > clickvisual.yaml

# 检查 clickvisual.yaml 是否无误，随后通过 kuebctl apply clickvisual.yaml
kubectl apply -f clickvisual.yaml --namespace default
```