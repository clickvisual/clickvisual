# ClickVisual

[![GitHub stars](https://img.shields.io/github/stars/clickvisual/clickvisual)](https://github.com/clickvisual/clickvisual/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/clickvisual/clickvisual)](https://github.com/clickvisual/clickvisual/issues)
[![GitHub license](https://img.shields.io/github/license/clickvisual/clickvisual)](https://github.com/clickvisual/clickvisual/blob/master/LICENSE)
[![Release](https://img.shields.io/github/v/release/clickvisual/clickvisual.svg)](https://github.com/clickvisual/clickvisual)
[![Go Report Card](https://goreportcard.com/badge/github.com/clickvisual/clickvisual)](https://goreportcard.com/report/github.com/clickvisual/clickvisual)
[![go.dev reference](https://img.shields.io/badge/go.dev-reference-007d9c?logo=go&logoColor=white&style=flat-square)](https://pkg.go.dev/github.com/clickvisual/clickvisual?tab=doc)
[![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=flat-square)](#contributors-)

[English](https://github.com/clickvisual/clickvisual/blob/master/README.md) | [中文](https://github.com/clickvisual/clickvisual/blob/master/README-CN.md)

ClickVisual is a lightweight browser-based logs analytics and logs search platform for ClickHouse, we are from [@Link Office](https://officesdk.com)


### Documentation

See <https://clickvisual.net>

### Log Query Demonstration
![log-search](https://clickvisual.net/clickvisual/assets/img/logs.b24e990e.gif)

### Alarm Process Demonstration
![log-search](https://clickvisual.net/clickvisual/assets/img/alarm.c7d6042a.gif)

### DAG Workflow
![log-search](https://clickvisual.net/clickvisual/assets/img/cv-dag.9387fb05.png)

### Configuration Page
![log-search](https://clickvisual.net/clickvisual/assets/img/visual-configuration.62ebf9ad.png)

## Features

- Support visual query dashboard, query histogram and raw logs for SQL.
- Support showing percentage for specified fields.
- Support vscode style configuration board, you can easily emit your fluent-bit configuration to Kubernetes ConfigMap.
- Out of the box, easily deployment with `kubectl`.
- Support for GitHub and GitLab Authentication.

## Architecture

![image](https://clickvisual.net/clickvisual/assets/img/technical-architecture.2858a64f.png)

## Installation

- For Docker

```bash
# clone clickvisual source code.
git clone https://github.com/clickvisual/clickvisual.git

# you may need to set docker image mirror, visit <https://github.com/yeasy/docker_practice/blob/master/install/mirror.md> for details.
docker-compose up

# then go to browser and visit http://localhost:19001.
# login username: clickvisual 
# login password: clickvisual
```

- For host

```bash
# download release.
# get latest version.
latest=$(curl -sL https://api.github.com/repos/clickvisual/clickvisual/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# for MacOS amd64.
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-darwin-amd64.tar.gz" -O clickvisual-${latest}.tar.gz 

# for Linux amd64.
wget "https://github.com/clickvisual/clickvisual/releases/download/${latest}/clickvisual-${latest}-linux-amd64.tar.gz" -O clickvisual-$(latest).tar.gz  

# extract zip file to current directory.
mkdir -p ./clickvisual-${latest} && tar -zxvf clickvisual-${latest}.tar.gz -C ./clickvisual-${latest}

# open config/default.toml, then change database and redis or other section configuration
# execute migration latest sql script in scripts/migration directory
# start clickvisual
cd ./clickvisual-${latest} && ./clickvisual -config config/default.toml

# then go to browser and visit http://localhost:19001
# login username: clickvisual
# login password: clickvisual
```

## Document Contribution

If you want to participate in [https://clickvisual.net](https://clickvisual.net) document updating activities  
Please refer to this document [https://github.com/clickvisual/clickvisual/tree/master/docs](https://github.com/clickvisual/clickvisual/tree/master/docs)

## Join Us

Join us, please add the "cv" keyword in the verification information. 

 <img src="https://helpcenter.shimonote.com/uploads/0LNQ550801CF2.png" width="150" />

Wechat id is "MEXES_"

## Contributors

Thanks for these wonderful people:
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://kl7sn.github.io"><img src="https://avatars.githubusercontent.com/u/2037801?v=4" width="64px;" alt=""/><br /><sub><b>MEX7</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://m1666.github.io"><img src="https://avatars.githubusercontent.com/u/39024186?v=4" width="64px;" alt=""/><br /><sub><b>m1666</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/askuy"><img src="https://avatars.githubusercontent.com/u/14119383?v=4" width="64px;" alt=""/><br /><sub><b>askuy</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sevennt"><img src="https://avatars.githubusercontent.com/u/10843736?v=4" width="64px;" alt=""/><br /><sub><b>sevennt</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://blog.lincolnzhou.com/"><img src="https://avatars.githubusercontent.com/u/3911154?v=4" width="64px;" alt=""/><br /><sub><b>LincolnZhou</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.duanlv.ltd"><img src="https://avatars.githubusercontent.com/u/20787331?v=4" width="64px;" alt=""/><br /><sub><b>Link Duan</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://findcat.cn/"><img src="https://avatars.githubusercontent.com/u/37197772?v=4" width="64px;" alt=""/><br /><sub><b>梁桂锋</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/qingbozhang"><img src="https://avatars.githubusercontent.com/u/14026937?v=4" width="64px;" alt=""/><br /><sub><b>qingbozhang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/qianque7"><img src="https://avatars.githubusercontent.com/u/68426635?v=4" width="64px;" alt=""/><br /><sub><b>qianque7</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rotk2022"><img src="https://avatars.githubusercontent.com/u/105830845?v=4" width="64px;" alt=""/><br /><sub><b>Chen Ziqian</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/antonyaz"><img src="https://avatars.githubusercontent.com/u/73863938?v=4" width="64px;" alt=""/><br /><sub><b>antony</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ArthurQiuys"><img src="https://avatars.githubusercontent.com/u/16526475?v=4" width="64px;" alt=""/><br /><sub><b>ArthurQ</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://laojianzi.github.io"><img src="https://avatars.githubusercontent.com/u/42930263?v=4" width="64px;" alt=""/><br /><sub><b>Jeff Li</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.asarea.cn"><img src="https://avatars.githubusercontent.com/u/3275714?v=4" width="64px;" alt=""/><br /><sub><b>Ather Shu</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://cloudsjhan.github.io/"><img src="https://avatars.githubusercontent.com/u/7600925?v=4" width="64px;" alt=""/><br /><sub><b>Jeremy</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pigcsy"><img src="https://avatars.githubusercontent.com/u/20635389?v=4" width="64px;" alt=""/><br /><sub><b>csy</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zackzhangkai"><img src="https://avatars.githubusercontent.com/u/20178386?v=4" width="64px;" alt=""/><br /><sub><b>zackzhangkai</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.kailing.pub/"><img src="https://avatars.githubusercontent.com/u/18591662?v=4" width="64px;" alt=""/><br /><sub><b>kl</b></sub></a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=clickvisual/clickvisual&type=Date)](https://star-history.com/#clickvisual/clickvisual&Date)


## Thank You
- [腾源会/WeOpen](https://cloud.tencent.com/act/pro/weopen-home)

## Thank JetBrains for Open Source licenses support
<a href="https://www.jetbrains.com/?from=Ego"><img src="https://resources.jetbrains.com/storage/products/company/brand/logos/GoLand_icon.svg" height="120" alt="JetBrains"/></a>


## Friends

- [DBM - An awesome database management tool specified for ClickHouse](https://github.com/EdurtIO/dbm)

