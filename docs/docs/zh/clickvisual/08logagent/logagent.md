# Clickvisual Agent 用法
ClickVisual 提供了`LogAgent`接口，用于直接查询`K8S` `Node`节点中的日志数据

## 代码逻辑简述
- 启动方式：`clickvisual agent`（对应 `api/cmd/agent/agent.go`），会按 `server.http` 配置起一个仅包含 `/api/v1/search` 与 `/api/v1/charts` 的 HTTP 服务（见 `router.GetAgentRouter`）。
- 节点侧处理：`api/internal/api/agent/agent.go` 将查询参数绑定为 `search.Request`，并调用 `api/internal/pkg/agent/search` 完成日志扫描/聚合。
- 平台侧访问：在 ClickVisual 主服务里把数据源类型设置为 `Agent`，`InstanceManager` 通过 `NewFactoryAgent(dsn)` 解析 DSN（JSON 数组形式的 Agent 地址），并使用 `resty` 逐个调用各 Agent 的 `/api/v1/search`、`/api/v1/charts` 聚合结果（`api/internal/service/inquiry/agent/agent.go`）。

## Clickvisual Agent 接口查询日志流程
* 提供一个Search接口
* 根据Search参数获得需要查询的数据
* 根据namespace，container，获取到要查container的日志目录
* 根据日志条件，扫描日志内容
* 返回数据

## 配置与地址填写（解答 #1134）
1. Agent 服务监听端口  
   - 在 Agent 节点的 `server.http.port` 指定监听端口，避免与主服务的 19001 冲突，常用示例：`19002`。  
   - 启动命令示例：`./clickvisual agent --config=/data/config/dev.toml`
2. 在 ClickVisual 主服务中添加 “数据源 - Agent” 时，`DSN` 填写 Agent 地址数组（JSON 字符串），每项为 `host:port` 或 `http://host:port`，可同时填多个 Agent，平台会并发聚合。  
   - 单实例示例：`["agent-svc.default.svc.cluster.local:19002"]`  
   - 多实例示例：`["10.0.0.12:19002","10.0.0.13:19002"]`  
   - 要求：主服务能直连这些地址（可用 NodePort、LB 或内网 IP）；路径固定为 `/api/v1/search`、`/api/v1/charts`，不需要额外前缀。
3. 前端查询参数会被透传到 Agent，包括：`startTime/endTime`、`limit`、`isK8s`、`container`（逗号分隔）、`dir`（非 K8s 时指定日志目录）、`keyWord`（关键词）；`charts` 请求会额外带 `interval`、`isChartRequest=1`。

## 常见问题
- “server 界面 Agent 地址怎么填？” → 在实例新增页的 DSN 里填 JSON 数组形式的 Agent 基础地址，格式如上所示，需确保主服务能访问这些地址。  
- 端口冲突 → 将 Agent 的 `server.http.port` 改为非 19001，例如 19002，并在 DSN 中使用该端口。  
- 无法返回数据 → 检查 DSN 是否为合法 JSON、网络可达性、Agent 日志是否有报错。

## Clickvisual Agent 部署方式
使用`Daemonset`部署到`K8S` `Node`节点上
### Containerd 权限
需要挂载3个目录，待确认，估计目前只需要containerd权限
* /var/run 读权限
* /var/log 读权限
* /var/lib/containerd 读权限

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    name: clickvisual-agent
  name: clickvisual-agent
  namespace: default
spec:
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      k8s-app: clickvisual-agent
    spec:
      affinity: {}
      containers:
        - command:
            - /bin/sh
            - '-c'
            - /clickvisual/bin/clickvisual agent
          env:
            - name: EGO_LOG_WRITER
              value: stderr
            - name: EGO_CONFIG_PATH
              value: /data/config/dev.toml
          image: xxxx/clickvisual:84674b6
          imagePullPolicy: Always
          name: clickvisual-agent
          resources:
            limits:
              cpu: '1'
              memory: 1Gi
            requests:
              cpu: 100m
              memory: 128Mi
          volumeMounts:
            - mountPath: /var/run
              name: run
              readOnly: true
            - mountPath: /var/log
              name: log
              readOnly: true
            - mountPath: /var/lib/containerd
              name: containerd-log
              readOnly: true
            - mountPath: /data/config
              name: config-volume-clickvisual
      dnsPolicy: ClusterFirstWithHostNet
      hostNetwork: true
      imagePullSecrets:
        - name: ee
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      serviceAccount: xx
      serviceAccountName: xx
      terminationGracePeriodSeconds: 30
      tolerations:
        - operator: Exists
      volumes:
        - hostPath:
            path: /var/run
            type: Directory
          name: run
        - hostPath:
            path: /var/log
            type: Directory
          name: log
        - hostPath:
            path: /var/lib/containerd
            type: Directory
          name: containerd-log
        - name: config-volume-clickvisual
          projected:
            defaultMode: 420
            sources:
              - configMap:
                  name: clickvisual
  updateStrategy:
    rollingUpdate:
      maxSurge: 0
      maxUnavailable: 1
    type: RollingUpdate
```

## Get Query参数
* startTime: 开始时间
* endTime: 结束时间
* data： 查询时间： last 6h, yesterday, today
* limit: 查询条数
* namespace: 查询哪个命令空间
* isK8s： 是否k8s，0或1
* container: k8s状态下要查的容器名，数组
* timestampKey: 时间字段名称，默认ts
* timestampFormat： 时间格式，默认unix时间戳

## 使用命令行工具
```bash
# 使用命令行查询
./bin/clickvisual command --config=config/dev.toml --k8s=true --key="lv=error" --container=svc-auth
# 使用命令行上传某个服务器上的文本
./bin/clickvisual upload --config=config/dev.toml --pathName="/var/log/pods/xxxx/logtail/9.log"
```




