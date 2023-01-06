# Docker 安装

clickvisual Docker 镜像地址：https://hub.docker.com/r/sevennt/clickvisual/tags

## Docker 启动配置
> https://github.com/clickvisual/clickvisual/tree/master/data/all-in-one/clickvisual/config

你需要把你的配置里 [mysql] 改成你本地 MySQL 的配置。

## 使用 Docker 启动
> docker run --name clickvisual -e EGO_CONFIG_PATH=/clickvisual/config/docker.toml -e EGO_LOG_WRITER=stderr -p 19001:19001 -d sevennt/clickvisual:master -v ./config:/clickvisual/config

需要把配置挂载到 docker 容器内

## 使用 Docker-Compose 命令
```
version: "3"
services:
  clickvisual:
    image: sevennt/clickvisual:master
    container_name: clickvisual
    environment:
      EGO_CONFIG_PATH: /clickvisual/config/docker.toml
      EGO_LOG_WRITER: stderr
    ports:
      - "19001:19001"
    restart: always
    volumes:
      - ./config:/clickvisual/config
    command: [ '/bin/sh', '-c', './bin/clickvisual' ]
```
需要把配置挂载到 docker 容器内

最后访问 http://localhost:19001



