# Docker-Compose 体验

本文主要介绍如何使用 `docker-compose` 在本地快速启动 ClickVisual Demo，体验日志生成、采集、查询的完整流程。

## 1. 基本信息

* 项目地址：<https://github.com/clickvisual/clickvisual>
* 浏览器输入 <http://127.0.0.1:19001> 访问 clickvisual UI，账号/密码：clickvisual/clickvisual
* 浏览器输入 <http://127.0.0.1:19002> 查看 Kafka 数据消费详情
* 浏览器输入 <http://127.0.0.1:19003> 模拟真实用户访问 Nginx 写入 access 日志
* 13306 为 MySQL 的连接端口，账号/密码：root/shimo
* 8123 为 ClickHouse 的连接端口，账号/密码：root/shimo

## 2. 操作流程

### 2.1. 启动 ClickVisual

* 克隆 clickvisual：git clone <https://github.com/clickvisual/clickvisual.git>
* 在 clickvisual 项目的根目录下执行：docker-compose up
* 在浏览器里输入 <http://127.0.0.1:19001>，进入到 clickvisual 登录页面，输入账号/密码：clickvisual/clickvisual

### 2.2. 创建数据库

创建实例，填写 DSN 参数 

> clickhouse://username:password@host1:9000,host2:9000/database?max_execution_time=60

docker-compose demo 填写

> clickhouse://root:shimo@clickhouse:9000/default?max_execution_time=60

![img.png](../../../images/create-database.png)

### 2.3. 创建日志

* 创建数据表：ingress_stdout
* 选择采集日志的时间类型，采集日志的标示必须位 `_time_`，类型支持 string 或者 float，在 demo 演示中必须选择  float 类型
* 日志保存时间：7 天
* Brokers：填入 docker-compose 启动的 Kafka 容器访问地址：kafka:9092
* Topic：Kafka 中采集日志的 topic name 是 ingress-stdout

![img.png](../../../images/table-create.png)

### 2.4 模拟访问

打开浏览器并访问 http://127.0.0.1:19003，可看到页面输出 hello，i'm clickvisual，此时 Nginx 已产生一条 access 日志。

![img.png](../../../images/simulation-access.png)

在浏览器中访问 http://localhost:19002/topics/ingress-stdout?o=-1&p=-1&q&s=50#messages，如可查到 Kafka 中日志内容，说明已经采集成功。随后再查看 consumers，可以看到 logger_ingress_stdout 这个消费组，说明 ClickHouse 正在消费。

![img.png](../../../images/kafka-data.png)

![img.png](../../../images/kafka-consume.png)

### 2.5. 查看日志

访问 http://localhost:19001/query ，我们可以查询到刚产生的 Nginx Access 日志。

![img.png](../../../images/table-query.png)

### 2.6. 增加分析字段

因为没有创建分析字段，所有字段的背景色都是灰色的，这种方式下是使用模糊搜索，性能不是很好，所以我们需要按照下图创建分析字段。

![img.png](../../../images/increase-index.png)

创建完后，我们再访问几次 http://127.0.0.1:19003，增加几条新的 access 日志后，就可以根据分析字段查询日志。

![img.png](../../../images/overall-introduction.png)
