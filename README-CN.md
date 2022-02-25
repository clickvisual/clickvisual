# mogo

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

[English](https://github.com/shimohq/mogo/blob/master/README.md) | [中文](https://github.com/shimohq/mogo/blob/master/README-CN.md)

Mogo 是一个轻量级的基于浏览器的日志分析和查询平台，可以配合 ClickHouse、MySQL 等多种数据源使用。

**日志查询界面**
![log-search](https://helpcenter.shimonote.com/uploads/0LUV5QCS01CHG.png)

**可视化配置界面**
![log-search](https://helpcenter.shimonote.com/uploads/0LJGD4DS01CII.png)

## 特性

- 提供了可视化的查询面板，可查询命中条数直方图和原始日志
- 配置好需要计算比率的字段后，可查看字段不同值占比
- 提供了可视化的 VS Code 风格配置中心，可以便捷地将 fluent-bit 配置同步到 Kubernetes 集群 ConfigMap 中
- 支持 GitHub 和 GitLab 授权登录

## 架构

![image](https://helpcenter.shimonote.com/uploads/0LL8P57E01E8G.png)

## 安装方法

- Docker 方式运行

```bash
git clone https://github.com/shimohq/mogo.git

# 国内可能需要配置 Docker Proxy，或者配置 image mirror
# 可参考这里：https://github.com/yeasy/docker_practice/blob/master/install/mirror.md
docker-compose up

# 打开浏览器访问 http://localhost:19001
# 默认登录用户名: shimo
# 默认登录密码: shimo
```

- 本地运行

```bash
# 下载二进制 
# 获取最新版本
latest=$(curl -sL https://api.github.com/repos/shimohq/mogo/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# MacOs 下下载
wget https://github.com/shimohq/mogo/releases/download/${latest}/mogo_${latest}_darwin_x86_64.tar.gz -O mogo.tar.gz 

# Linux 下下载
wget https://github.com/shimohq/mogo/releases/download/${latest}/mogo_${latest}_linux_x86_64.tar.gz -O mogo.tar.gz  

# 解压 tar.gz 包到 ./mogo 目录
mkdir -p ./mogo-${latest} && tar -zxvf mogo-${latest}.tar.gz -C ./mogo-${latest}

# 修改 config/default.toml 配置文件
# 执行 scripts/migration 下迁移脚本，创建数据库和表
# 启动 mogo
cd ./mogo-${latest} && ./mogo -config config/default.toml

# 打开浏览器访问 http://localhost:19001
# 默认登录用户名: shimo 
# 默认登录密码: shimo
```

## 文档 

访问 <https://mogo.shimo.im> 查看最新文档。

## Main Tasks

## Bugs or features

如果需要提交 Bug，可以点击 [这里](https://github.com/shimohq/mogo/issues)。

## 加入我们

加入我们，请在验证信息里添加 mogo 关键字

 <img src="https://helpcenter.shimonote.com/uploads/0LNQ550801CF2.png" width="150" />

## Contributors

Thanks for these wonderful people:
