# ClickVisual

[![Go Report Card](https://goreportcard.com/badge/github.com/clickvisual/clickvisual)](https://goreportcard.com/report/github.com/clickvisual/clickvisual)
[![Release](https://img.shields.io/github/v/release/clickvisual/clickvisual.svg)](https://github.com/clickvisual/clickvisual)
[![go.dev reference](https://img.shields.io/badge/go.dev-reference-007d9c?logo=go&logoColor=white&style=flat-square)](https://pkg.go.dev/github.com/clickvisual/clickvisual?tab=doc)
[![GitHub license](https://img.shields.io/github/license/clickvisual/clickvisual)](https://github.com/clickvisual/clickvisual/blob/master/LICENSE)
[![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=flat-square)](#contributors-)

[English](https://github.com/clickvisual/clickvisual/blob/master/README.md) | [中文](https://github.com/clickvisual/clickvisual/blob/master/README-CN.md)

ClickVisual 是一个轻量级的基于浏览器的日志分析和查询平台，底层数据存储采用 ClickHouse。

## 文档
访问 <https://clickvisual.gocn.vip/> 查看最新文档。

### 日志查询演示
![log-search](https://cdn.gocn.vip/clickvisual/assets/img/logs.b24e990e.gif)

### 告警配置演示
![log-search](https://cdn.gocn.vip/clickvisual/assets/img/alarm.c7d6042a.gif)

### DAG 工作流
![log-search](https://cdn.gocn.vip/clickvisual/assets/img/dag.f8977497.png)

### 可视化配置界面
![log-search](https://cdn.gocn.vip/clickvisual/assets/img/visual-configuration.62ebf9ad.png)

## 特性

- 提供了可视化的查询面板，可查询命中条数直方图和原始日志
- 配置好需要计算比率的字段后，可查看字段不同值占比
- 提供了可视化的 VS Code 风格配置中心，可以便捷地将 fluent-bit 配置同步到 Kubernetes 集群 ConfigMap 中
- 支持 GitHub 和 GitLab 授权登录

## 架构

![image](https://cdn.gocn.vip/clickvisual/assets/img/technical-architecture.f3cf8d04.png)

## 安装方法

- Docker 方式运行

```bash
git clone https://github.com/clickvisual/clickvisual.git

# 国内可能需要配置 Docker Proxy，或者配置 image mirror
# 可参考这里：https://github.com/yeasy/docker_practice/blob/master/install/mirror.md
docker-compose up

# 打开浏览器访问 http://localhost:19001
# 默认登录用户名: clickvisual
# 默认登录密码: clickvisual
```

- 本地运行

```bash
# 下载二进制 
# 获取最新版本
latest=$(curl -sL https://api.github.com/repos/clickvisual/clickvisual/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# MacOs 下下载
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-darwin-amd64.tar.gz" -O clickvisual-${latest}.tar.gz 

# Linux 下下载
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-linux-amd64.tar.gz" -O clickvisual-$(latest).tar.gz  

# 解压 tar.gz 包到 ./clickvisual 目录
mkdir -p ./clickvisual-${latest} && tar -zxvf clickvisual-${latest}.tar.gz -C ./clickvisual-${latest}

# 修改 config/default.toml 配置文件
# 执行 scripts/migration 下迁移脚本，创建数据库和表
# 启动 clickvisual
cd ./clickvisual-${latest} && ./clickvisual --config config/default.toml

# 打开浏览器访问 http://localhost:19001
# 默认登录用户名: clickvisual 
# 默认登录密码: clickvisual
```


## Main Tasks

## Bugs or features

如果需要提交 Bug，可以点击 [这里](https://github.com/clickvisual/clickvisual/issues)。

## 加入我们

加入我们，请在验证信息里添加 cv 关键字

 <img src="https://helpcenter.shimonote.com/uploads/0LNQ550801CF2.png" width="150" />

## 感谢

- [Jetbrains](https://www.jetbrains.com)
- [腾源会/WeOpen](https://cloud.tencent.com/act/pro/weopen-home)

## 伙伴

- [DBM - An awesome database management tool specified for ClickHouse](https://github.com/EdurtIO/dbm)
