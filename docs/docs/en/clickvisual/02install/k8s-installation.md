# Kubernetes Cluster installation

This article mainly introduces how to use helm or kubectl to deploy ClickVisual to kubernetes cluster.

## 1. Deployment requirements
- Kubernetes >= 1.17
- Helm >= 3.0.0

## 2. Deploy fluent bit (Reference)

You can directly refer to the official fluent bit website for deployment https://docs.fluentbit.io/ , just ensure that the data written to Kafka contains the following two fields.
- _time_
- _log_

[https://docs.fluentbit.io/manual/installation/kubernetes#installation](https://docs.fluentbit.io/manual/installation/kubernetes#installation)

Fluent Bit Kubernetes Daemonset 
[https://github.com/fluent/fluent-bit-kubernetes-logging](https://github.com/fluent/fluent-bit-kubernetes-logging)

fluentbit-configmap.yaml is as follows:
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

    # Disabled when env is configured in DaemonSet
    #@Set CLUSTER_NAME=shimodev
    #@Set KAFKA_BROKERS=127.0.0.1:9092

  input-kubernetes.conf: |
    [INPUT]
        Name              tail
        # Tag identifies the data source, which is used to select data in the subsequent process Filter and Output
        Tag               ingress.*
        Path              /var/log/containers/nginx-ingress-controller*.log
        Parser            docker
        DB                /var/log/flb_ingress.db
        Mem_Buf_Limit     15MB
        Buffer_Chunk_Size 32k
        Buffer_Max_Size   64k
        # Skip the row when length greater than Buffer_Max_Size. If Skip_Long_Lines is Off, the collection will be stopped when encounter the row above.
        Skip_Long_Lines   On
        Refresh_Interval  10
        # If the acquisition file has no database offset record, it is read from the header of the file. When the log file is large, it will lead to the increase of fluent memory usage and oomkill
        #Read_from_Head    On

    [INPUT]
        Name              tail
        # Tag identifies the data source, which is used to select data in the subsequent process Filter and Output
        Tag               ingress_stderr.*
        Path              /var/log/containers/nginx-ingress-controller*.log
        Parser            docker
        DB                /var/log/flb_ingress_stderr.db
        Mem_Buf_Limit     15MB
        Buffer_Chunk_Size 32k
        Buffer_Max_Size   64k
        # Skip the row when length greater than Buffer_Max_Size. If Skip_Long_Lines is Off, the collection will be stopped when encounter the row above.
        Skip_Long_Lines   On
        Refresh_Interval  10
        # If the acquisition file has no database offset record, it is read from the header of the file. When the log file is large, it will lead to the increase of fluent memory usage and oomkill
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
        # Skip the row when length greater than Buffer_Max_Size. If Skip_Long_Lines is Off, the collection will be stopped when encounter the row above.
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
        # When enabled,it parses the JSON content of the log field, extract it to the root level, and attach it to the field specified by Merge_Log_Key. 
        Merge_Log           Off
        #Merge_Log_Key       log_processed
        #Merge_Log_Trim      On
        # Whether to keep the original log field after merging the log field
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
        # Merge_Log=On Parse the JSON content of the log field, extract it to the root level, and attach it to the field specified by Merge_Log_Key.
        Merge_Log           Off
        # Whether to keep the original log field after merging the log field
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
        Rename          time _time_
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
        # ${NODE_IP} Configure ENV injection through the daemonset
        Add             _node_ip_ ${NODE_IP}

    [FILTER]
        Name    grep
        Match   ingress.*
        #Regex container_name ^nginx-ingress-controller$
        #Regex stream ^stdout$
        Exclude _source_ ^stderr$
        # Exclude TCP agent logs (different log formats affect Collection)
        Exclude log ^\[*

    [FILTER]
        Name    grep
        Match   ingress_stderr.*
        Exclude _source_ ^stdout$

    [FILTER]
        Name    grep
        Match   kube.*
        #Regex stream ^stdout$
        Exclude log (ego.sys)

    [FILTER]
        Name    grep
        Match   ego.*
        #Regex lname ^(ego.sys)$
        Regex   log ("lname":"ego.sys")

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
        # Similar to the effect Merge_Log=On at filter stage, the JSON content of the log field is parsed, but cannot be extracted to the root level
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

## Deploy ClickVisual
   Clone git repository:

```
git clone https://github.com/clickvisual/clickvisual.git
```

### Use custom configuration

```
cd clickvisual && cp config/default.toml data/helm/clickvisual/default.toml
```
Edit mysql、auth and other segment configurations in data/helm/clickvisual/default.toml,update mysql.dsn,auth.redisAddr,auth.redisPassword as you want.

Update the value `configs/default.toml` in data/helm/clickvisual/templates/deployment.yaml if you need
```
- name: EGO_CONFIG_PATH
value: "configs/default.toml"
```

### Install
Method 1: [recommended] install directly with Helm:
```
helm install clickvisual data/helm/clickvisual --set image.tag=latest --namespace default
```
If you have pushed the clickvisual image to your own harbor repository,use --set image.respository to change respository address.
```
helm install clickvisual data/helm/clickvisual --set image.repository=${YOUR_HARBOR}/${PATH}/clickvisual --set image.tag=latest --namespace default
```

Method 2: [optional] after rendering yaml with helm, install it manually through kubectl:
```
# Use helm template render clickvisual.yaml for install
helm template clickvisual data/helm/clickvisual --set image.tag=latest > clickvisual.yaml

# You can use "--set image.repository" to override the default image path
# helm template clickvisual clickvisual --set image.repository=${YOUR_HARBOR}/${PATH}/clickvisual --set image.tag=latest > clickvisual.yaml

# Check clickvisual.yaml and use kuebctl apply 
kubectl apply -f clickvisual.yaml --namespace default
```