# LogAgent
ClickVisual 提供了`LogAgent`接口，用于直接查询`K8S` `Node`节点中的日志数据

## LogAgent 接口查询日志流程
* 提供一个Search接口
* 根据Search参数获得需要查询的数据
* 根据namespace，container，获取到要查container的日志目录
* 根据日志条件，扫描日志内容
* 返回数据

## LogAgent部署方式
使用`Daemonset`部署到`K8S` `Node`节点上
### Containerd权限
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




