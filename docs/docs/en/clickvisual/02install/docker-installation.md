# Docker Install

ClickVisual Docker Image：https://hub.docker.com/r/sevennt/clickvisual/tags

## Docker start config
> https://github.com/clickvisual/clickvisual/tree/master/data/all-in-one/clickvisual/config

You need to change [mysql] to your local MySQL configuration.

## Start with Docker
> docker run --name clickvisual -e EGO_CONFIG_PATH=/clickvisual/config/docker.toml -e EGO_LOG_WRITER=stderr -p 19001:19001 -d sevennt/clickvisual:master -v ./config:/clickvisual/config

The configuration needs to be attached to the docker container.

## Start with Docker-Compose 
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
command: [ '/bin/sh', '-c', './bin/clickvisual' ]<br/>
```
The configuration needs to be attached to the docker container.

At last,access http://localhost:19001



