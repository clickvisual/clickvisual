# 基础功能

完成 clickvisual 部署后，首先要做的是配置 Kubernetes 集群、配置 ClickHouse 数据源。

## 1. 集群配置管理

在顶部导航栏中，选择 **系统设置 -> 集群管理：**

![img.png](../../../images/instance-list.png)

由于我们尚未配置集群，此处列表为空。我们点击 **+新增集群**，在弹出表单中填入需要配置的集群信息，包括集群名称、API Server 地址、kube-config 配置等。

![img.png](../../../images/k8s-create.png)

提交后即可在做 LogAgent 配置下发时使用。

## 2. ClickHouse 数据源管理

在顶部导航栏中，选择 **系统设置 -> 实例管理：**

![img.png](../../../images/instance-list.png)

默认没有配置数据源实例，所以此处为空，点击 **+新增实例**，增加一个新的 ClickHouse 实例作为数据源。

数据源配置类似：`clickhouse://username:password@host1:9000,host2:9000/database?dial_timeout=200ms&max_execution_time=60`

基于 [clickhouse-go](https://github.com/ClickHouse/clickhouse-go)

![img.png](../../../images/instance-create.png)

配置好 `dev-clickhouse` 这个数据源后，稍后即可以在日志查询页面中使用。

## 3. 子路径配置

需要修改两个配置：导入环境变量，重新编译前端；后端服务启动配置修改。

假设需要支持http://localhost:19001/clickvisual/这个子路径

1. 首先导入环境变量，重新编译前端，可以在项目根目录执行 make build.ui build.dist

> export PUBLIC_PATH=/clickvisual/

2. 完成前端编译后进行后端编译，执行make build.api

顺利完成以上两个步骤后，会在 ./bin 文件夹得到编译好的二进制文件，前端文件已经被打包到二进制文件



修改服务启动配置：
- serveFromSubPath 配置为 true
- rootURL 子路径配置

``` 
[app]
serveFromSubPath = true
rootURL = "http://localhost:19001/clickvisual/"
```

此时目录结构如下图所示，执行./bin/clickvisual server --config=./config/default.toml 启动服务即可

![img.png](../../../images/config-tree.png)

## 4. ClickHouse 集群配置

选择类型：集群
- 有副本，勾选副本即可
- 填入集群名称，例如 shard2-repl1  

![img.png](../../../images/instance-create-cluster-config.png)

选择对应的集群实例后新建数据库，数据库建立成功后，后续操作与单机模式一致。

![img_1.png](../../../images/database-create-cluster.png)

## 5. 已有数据表接入

在系统设置中新增实例。

![img.png](../../../images/instance-manager.png)

点击新增日志库，选择`已有日志库`，时间解析字段是日志数据时间轴字段，可选类型为`DateTime64(3)`、`DateTime`、`Int32`、`Int64`，目标数据表需要包含其中一种类型的字段，才可以正常接入。

![img.png](../../../images/exist-table-choice.png)

