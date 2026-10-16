# 日志告警

`可用版本 >= 0.4.4`  
`clickhouse <= v22.3.7`

## AI 告警分析

升级已有部署时，先按升级流程执行元数据库迁移（`/api/v1/migration`），创建分析任务及发送记录表，并补充规则冷却时间和会话来源字段，再开启功能。

完整版本支持在普通告警之后，异步生成一条 AI 分析并发送到此次告警原有的通知渠道。普通告警无需等待模型响应。先在模型设置中配置可用模型，并在服务配置中开启：

```toml
[alarm.ai]
enabled = true
cooldownSeconds = 900
```

省略配置时默认关闭，冷却时间默认为 900 秒。规则接口的 `aiCooldownSeconds` 可覆盖冷却时间，设为 `0` 时继承全局值。分析使用规则负责人的日志权限，先查询告警窗口内的日志，再根据证据生成结论；关联查询也必须通过该用户的权限检查，且不能扩大时间窗口。模型或初始日志查询失败时不会发送成功结论。

根因排查会引导 AI 在发现明确的下游慢调用或超时后，沿同一请求链路继续查询该服务的服务端和业务日志，优先使用同实例、同环境的日志表，避免沿用上游接口名或慢请求阈值过滤掉下游原因日志。Ask 中继续排查也使用这套规则。分析仍受步骤和执行时间限制；无权限、日志未接入或缺少新的线索时，应明确说明证据缺口，不能将下游超时直接认定为数据库故障或保存失败。当前工具只读取已接入且有权限的日志，不会自动访问未接入的监控指标或源码。

不同日志表的链路字段可能不一致，也可能记录在 `reqIds` 等数组中。精确字段查询无结果时，排查规则会引导 AI 在相同服务和时间窗口内，使用已获取的完整请求 ID 检索原始日志，再按实际字段继续关联，避免因字段不同漏查。

Ask 和自动告警分析在达到 8 步排查上限或拦截重复工具调用后，会额外进行一次只生成结论的模型调用，不再执行新工具。结论依据已有证据，可以是已确认的现象或异常环节，不要求必须找到根因，并说明仍未确认的原因。收尾时会保留本轮用户问题和最近的工具结果。Ask 在结论整理失败时保留查询结果并说明未能确认原因；自动告警分析整理失败则按失败任务处理，不发送成功分析。

默认空条件 `1=1` 会转换为空过滤条件。普通过滤条件支持反引号引用的点号字段（如 `k8s.namespace.name`），会保留原规则的事件和环境过滤条件。旧规则中的聚合 SQL 或其他无法转换的表达式不会直接执行；此时分析先使用同一日志表的时间窗口样本，再引导 AI 按原规则中的事件线索收窄查询。无过滤样本的数量不是原规则匹配数量，也没有复算聚合指标；这些限制保留在 Ask 的证据上下文中，通知只说明影响结论的具体缺口。

同一规则、条件、日志表和告警标签的连续触发会合并：分析排队或执行期间不重复创建，成功分析后在冷却时间内不重复分析。冷却期后再次分析会查询最近的时间窗口。恢复后再次触发会作为新事件处理。去重和任务租约保存在元数据库中，多实例共享状态；失败任务最多尝试三次，渠道发送也各自最多尝试三次，已确认成功的渠道不会重复发送。网络超时可能发生服务端已接收但本地未确认的情况，因此无法保证外部渠道严格只收到一次。

分析消息附带 Ask 继续排查链接。`app.rootURL` 应为用户可访问的部署地址，包括部署子路径（例如 `https://example.com/clickvisual`）。链接只包含不透明的分析标识。点击后需登录，并重新检查点击者对全部证据表的权限；权限不足时不会导入证据。有权限的每次访问会创建独立的个人会话，带入告警背景、日志证据和 AI 结论。导入后地址替换为 `sessionId`，刷新继续打开该会话。不同用户以及同一用户再次访问原告警链接，均不会共享可编辑会话。

自动分析记录不会出现在个人历史记录中。通知使用独立的“AI 告警分析”标题和告警名称，正文展示可读的分析窗口（UTC+8）。模型按结论、最多两条关键证据组织摘要，必要时补充一个具体的下一步动作，目标为 150~300 字；不罗列工具执行过程或重复限制说明。底部提供“在 Ask 中继续排查”链接。正文只发送长度受限的分析摘要，过长段落会单独缩短，不附加完整日志样本；已有权限的用户可在 Ask 中查看结论、证据并继续提问。

Ask 中的“在查询页打开”链接会在新标签页打开对应日志查询，当前对话会保留。

对话展示分析结论和关键证据，不自动附加“日志样本”区域；原始日志可通过查询页链接查看。用户拥有相应日志表权限时，15 分钟以内的查询会直接执行，包括切换日志表，不再询问确认。更长时间的跨表查询和扩大至超过 6 小时的查询仍保留确认步骤。

每条 AI 回复下方常驻显示“复制排查上下文”图标，点击可复制截至该条回复的对话、查询条件、时间范围和已获取的日志证据，粘贴给本地 AI 继续排查。复制成功后图标短暂变为勾号。复制操作不会创建分享链接或向外部 AI 发送数据；分享对话的只读页面也支持复制。

## 架构说明

![img.png](../../../images/alarm-arch.png)

## 使用说明

1. 在 ClickHouse 中产生对应数据表的 Materialized View，作用是将数据按照配置的规则以秒为单位录入 metrics.samples 表中
2. 产生的 Prometheus 告警规则写入配置的文件或者 configmap 中
3. Prometheus 读取 metrics.samples 的数据，并根据告警规则产生告警，推送到 Prometheus AlertManager
4. Prometheus AlertManager 通过 webhook 推送到 clickvisual，再由 clickvisual 分发到钉钉

## 组件配置

按照文档完成安装后告警触发流程如下

![img.png](../../../images/alarm-flow.png)

### ClickVisual

配置文件中增加如下配置，作用是让 Prometheus 远程读写 ClickHouse
- host:port 表示 prometheus 配置的 remote_read/remote_write 需要的 host:port
- 其余配置为 clickhouse 配置

clickhouseDSN 格式参考：
> clickhouse://username:password@host:9000/metrics?dial_timeout=200ms&max_execution_time=60

```
[prom2click]
enable = true

[[prom2click.cfgs]]
host = "127.0.0.1"
port = 9201 
clickhouseDSN = "tcp://127.0.0.1:9000"
clickhouseDB = "metrics"
clickhouseTable = "samples"
```

### ClickHouse

新增`graphite_rollup` 配置，配置路径可以参考，根据 clickhouse 的版本不通略有区别，具体以官方指导配置为准。

![img.png](../../../images/graphite_rollup_tree.png)

```xml
<yandex>
  <graphite_rollup>
    <path_column_name>tags</path_column_name>
    <time_column_name>ts</time_column_name>
    <value_column_name>val</value_column_name>
    <version_column_name>updated</version_column_name>
    <default>
      <function>sum</function>
      <retention>
        <age>0</age>
        <precision>1</precision>
      </retention>
      <retention>
        <age>360</age>
        <precision>60</precision>
      </retention>
      <retention>
        <age>3600</age>
        <precision>300</precision>
      </retention>
      <retention>
        <age>86400</age>
        <precision>3600</precision>
      </retention>
    </default>
  </graphite_rollup>
</yandex>
```

### Prometheus

需要支持配置热更新，[参考文档](https://songjiayang.gitbooks.io/prometheus/content/qa/hotreload.html)

> 从 2.0 开始，hot reload 功能是默认关闭的，如需开启，需要在启动 Prometheus 的时候，添加 --web.enable-lifecycle 参数。

启动文件里面增加如下配置：

- clickvisual 为对应服务访问地址
- alertmanager 为对应服务访问地址

rule_files 中配置的路径需要与系统配置中下发路径一致

```yaml
global:
  evaluation_interval: "15s"
rule_files:
  - /etc/prometheus/rules/*.yaml
alerting:
  # 告警配置文件
  alertmanagers:
  # 修改：使用静态绑定
  - static_configs:
    # 修改：targets、指定地址与端口
    - targets: ["alertmanager:9093"]
remote_read:
  - url: "http://clickvisual:9201/read"
    read_recent: true
```

### AlertManager

告警方式为 webhook，回调到 clickvisual 服务，修改 url 地址，保证可以正常访问 clickvisual 服务。

```yaml
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 10m
  receiver: webhook

receivers:
- name: 'webhook'
  webhook_configs:
  - url: 'http://clickvisual:19001/api/v1/prometheus/alerts'
```

## 进入 ClickVisual 进行后续操作

### 基础配置

如果已添加实例，可以看到如下界面，检测上面配置的各组件是否正确。  

点击提示没有 mertics.samples 表，点击操作中的 + ，即可完成基础数据表创建。

![img.png](../../../images/alarm-manager.png)

#### 文件模式
将告警规则写入本地文件，则将文件路径配置为 `/etc/prometheus/rules`

> tips：考虑容器挂载统一同一个目录的情况，这里的配置路径为 clickvisual 可读写路径，会通过挂载自动同步到 prometheus。

```yaml
rule_files:
- /etc/prometheus/rules/*.yaml
```

#### K8s 模式
如果是使用 K8s 模式选择对应 configmap 即可。

#### Operator 模式

```yaml
metadata:
  labels:
    prometheus: k8s
    role: alert-rules
  name: prometheus-k8s-rulefiles-0
  namespace: monitoring
```

根据以上配置，rules 会存储到如下环境的，一下文件中。

![img.png](../../../images/alarm-operator.png)

文件名 `monitoring-prometheus-k8s-rulefiles-0-056fd48d-b00b-4291-9737-bc53cf343f8a.yaml`

内容：
```yaml
groups:
- name: cv-1-a06b3784-a4d1-4d20-8adf-1d00827f2be7
  rules:
  - alert: ClickVisual-a06b3784_a4d1_4d20_8adf_1d00827f2be7_58
    annotations:
    description: '{{ $labels.desc }}  (当前值: {{ $value }})'
    summary: 告警 {{ $labels.name }}
    expr: min_over_time(clickvisual_alert_metrics{uuid="a06b3784-a4d1-4d20-8adf-1d00827f2be7",alarmId="1",filterId="58"}[1m] offset 10s)>50
    for: 1m
    labels:
    severity: warning
- name: cv-1-a0698d5a-9584-4979-90fc-2ff2a667d7c1
  rules:
  - alert: ClickVisual-a0698d5a_9584_4979_90fc_2ff2a667d7c1_9
    annotations:
    description: '{{ $labels.desc }}  (当前值: {{ $value }})'
    summary: 告警 {{ $labels.name }}
    expr: clickvisual_alert_metrics{uuid="a0698d5a-9584-4979-90fc-2ff2a667d7c1",alarmId="2",filterId="9"} offset 10s>1
    for: 1m
    labels:
    severity: warning
```

### 告警配置

![img.png](../../../images/alarm-config.png)

- 检查频率：监控数据数据检测周期
- 检查统计：按照秒进行数据统计
  - 常规模式，统计符合规则数据条数
  - 聚合模式，记录 val 值
- 触发条件：对检查统计步骤计算的值进行规则检测后触发告警

比如以上例子，日志中每秒出现 disk_usage_rate>90 的日志总条数大于 90。

### 常规模式

在输入框部分填入 where 部分语句即可，点击预览后进入后续告警流程。

### 聚合模式

例如你需要配置一小时内 nginx 访问失败率的告警，SQL 语句如下所示：

```
SELECT 
       round(sum( case when status > 499 then 1 else 0 end ) * 100.0 / count(1), 2) as val,
       proxy_upstream_name  as service
from ingress.ingress_stdout
WHERE ("_time_second_" >= toDateTime(NOW() - 3600)) AND ("_time_second_" < toDateTime(NOW()))
group by service
having  length(service) > 3 
ORDER by val desc
```

根据这个配置计算出来，metrics 是实际写入 metrics.samples 的值，即【触发条件】配置的目标数据

![img.png](../../../images/alarm-demo.png)

要求： 
- select 监控指标必须使用 `as val`
- 其他的语法为 clickhouse 语法 [参考文档](https://clickhouse.com/docs/zh/sql-reference/statements/select/)

![img.png](../../../images/alarm-agg.png)

### 推送效果

![img.png](../../../images/alarm-msg-push.png)

## 其他文档

[集群部署配置](https://github.com/clickvisual/clickvisual/tree/master/data/k8s/prometheus)
