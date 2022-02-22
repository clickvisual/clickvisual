# mogo

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

[English](https://github.com/shimohq/mogo/blob/master/README.md) | [中文](https://github.com/shimohq/mogo/blob/master/README-CN.md)

Mogo is a lightweight browser-based logs analytics and logs search platform for some datasource(ClickHouse or MySQL).

**log search page**
![log-search](https://helpcenter.shimonote.com/uploads/0LUV5QCS01CHG.png)

**configuration page**
![log-search](https://helpcenter.shimonote.com/uploads/0LJGD4DS01CII.png)

## Features

- visual query dashboard, support query Histogram and raw logs for SQL.
- shows percentage for specified fields.
- vscode style configuration board, you can easily emit your fluent-bit configuration to Kubernetes ConfigMap.
- Out of the box, easily deployment with `kubectl`.
- Support for GitHub and GitLab Authentication.

## Architecture

![image](https://helpcenter.shimonote.com/uploads/0LL8P57E01E8G.png)

## Installation

- For Docker

```bash
# clone mogo source code.
git clone https://github.com/shimohq/mogo.git

# you may need to set docker image mirror, visit <https://github.com/yeasy/docker_practice/blob/master/install/mirror.md> for details.
docker-compose up

# then go to browser and visit http://localhost:19001.
# login username: shimo 
# login password: shimo
```

- For host

```bash
# download release.
# get latest version.
latest=$(curl -sL https://api.github.com/repos/shimohq/mogo/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')

# for MacOS amd64.
wget "https://github.com/shimohq/mogo/releases/download/${latest}/mogo-${latest}-darwin-amd64.tar.gz" -O mogo-${latest}.tar.gz 

# for Linux amd64.
wget "https://github.com/shimohq/mogo/releases/download/${latest}/mogo-${latest}-linux-amd64.tar.gz" -O mogo-$(latest).tar.gz  

# extract zip file to current directory.
mkdir -p ./mogo-${latest} && tar -zxvf mogo-${latest}.tar.gz -C ./mogo-${latest}

# open config/default.toml, then change database and redis or other section configuration
# execute migration latest sql script in scripts/migration directory
# start mogo
cd ./mogo-${latest} && ./mogo -config config/default.toml

# then go to browser and visit http://localhost:19001
# login username: shimo
# login password: shimo
```

## Documentation

See <https://mogo.shimo.im>

## Main Tasks

## Bugs or features

If you want to report a bug or request for a feature, create a issue [here](https://github.com/shimohq/mogo/issues).

## Join Us

Join us, please add the "mogo" keyword in the verification information.

 <img src="https://helpcenter.shimonote.com/uploads/0LNQ550801CF2.png" width="150" />



## Contributors

Thanks for these wonderful people:
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://kl7sn.github.io"><img src="https://avatars.githubusercontent.com/u/2037801?v=4" width="64px;" alt=""/><br /><sub><b>MEX7</b></sub></a></td>
    <td align="center"><a href="https://m1666.github.io"><img src="https://avatars.githubusercontent.com/u/39024186?v=4" width="64px;" alt=""/><br /><sub><b>m1666</b></sub></a></td>
    <td align="center"><a href="https://github.com/askuy"><img src="https://avatars.githubusercontent.com/u/14119383?v=4" width="64px;" alt=""/><br /><sub><b>askuy</b></sub></a></td>
    <td align="center"><a href="https://github.com/sevennt"><img src="https://avatars.githubusercontent.com/u/10843736?v=4" width="64px;" alt=""/><br /><sub><b>sevennt</b></sub></a></td>
    <td align="center"><a href="http://blog.lincolnzhou.com/"><img src="https://avatars.githubusercontent.com/u/3911154?v=4" width="64px;" alt=""/><br /><sub><b>LincolnZhou</b></sub></a></td>
    <td align="center"><a href="https://www.duanlv.ltd"><img src="https://avatars.githubusercontent.com/u/20787331?v=4" width="64px;" alt=""/><br /><sub><b>Link Duan</b></sub></a></td>
    <td align="center"><a href="https://findcat.cn/"><img src="https://avatars.githubusercontent.com/u/37197772?v=4" width="64px;" alt=""/><br /><sub><b>梁桂锋</b></sub></a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

