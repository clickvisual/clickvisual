# mogo

[![Go Report Card](https://goreportcard.com/badge/github.com/shimohq/mogo)](https://goreportcard.com/report/github.com/shimohq/mogo)
[![Release](https://img.shields.io/github/v/release/shimohq/mogo.svg)](https://github.com/shimohq/mogo)
[![GitHub license](https://img.shields.io/github/license/shimohq/mogo)](https://github.com/shimohq/mogo/blob/master/LICENSE)

Mogo is a lightweight browser-based logs analytics and logs search platform for some datasource(ClickHouse, MySQL, etc.)

## Live demo

TODO.

## Features

- visual query dashboard, support query Histogram and raw logs for SQL.
- shows percentage for specified fields.
- vscode style configuration board, you can easily emit your fluent-bit configuration to Kubernetes ConfigMap.
- Out of the box, easily deployment with `kubectl`.
- Support for GitHub and GitLab Authentication.

## Architecture
![image](./docs/images/mogoprocess.png)

## Installation

- For host

```bash
# download release
# go to https://github.com/shimohq/mogo/releases and choose specific release to download.
latest=$(curl -sL https://api.github.com/repos/shimohq/mogo/releases/latest | grep  ".tag_name" | sed -E 's/.*"([^"]+)".*/\1/')
# for MacOS
wget https://github.com/shimohq/mogo/releases/download/${latest}/mogo_${latest}_darwin_x86_64.tar.gz -O mogo.tar.gz 
# for Linux
wget https://github.com/shimohq/mogo/releases/download/${latest}/mogo_${latest}_linux_x86_64.tar.gz -O mogo.tar.gz  

# extract zip file
tar xvf mogo.tar.gz -O 

# start api server


# configure nginx config

```

- For Docker

```bash
git clone https://github.com/shimohq/mogo.git
docker-compose up

# then go to browser and visit http://localhost:9001
# username: admin
# password: admin
```

- For helm

```bash
```

## Main Tasks

-[x] task1

-[x] task2

## Bugs or features

If you want to report a bug or request for a feature, create a issue [here](https://github.com/shimohq/mogo/issues).

## Contributors
