# 本地开发帮助文档

## 开发环境构建

快速搭建本地开发环境，下面两个方式二选一即可

### 本地环境

可以选择使用本地组件，例如本地的 mysql、redis 等

### docker-compose 环境

使用 docker-compose 组件

fork 代码后，在项目根目录可以看到 `docker-compose.devops.yml`

执行
> docker-compose -f docker-compose.devops.yml up

成功启动

![img.png](../../../images/env.png)

## 代码允许

### 后端运行

> go run ./api/main.go --config=./config/default.toml

### 前端运行

> cd ./ui
> yarn install
> yarn run start

保证 target 指向后端服务即可

![img_6.png](../../../images/env-6.png)

![img_7.png](../../../images/env-7.png)

### 页面访问

服务启动后访问 [http://localhost:8000/](http://localhost:8000/)

![img_1.png](../../../images/env-1.png)

完成数据库初始化之后，使用 clickvisual/clickvisual 登录

