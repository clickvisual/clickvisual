APP_NAME:=clickvisual
SHELL:=/bin/bash
ROOT:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
APP_PATH=$(ROOT)
SCRIPT_PATH:=$(APP_PATH)/scripts
COMPILE_OUT:=$(APP_PATH)/bin/$(APP_NAME)
HUB_USER:=clickvisual
EAPI_VERSION:=v0.4.6
EAPI_GO_VERSION:=go1.24.4
REDOCLY_VERSION:=2.51.0

build: build.ui build.ui-v2 build.dist build.api

docs:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>ego gen api $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@egogen --config egogen.yaml
	@echo -e "success \n"

api-docs:
	@GOTOOLCHAIN=$(EAPI_GO_VERSION) go install github.com/gotomicro/eapi/cmd/eapi@$(EAPI_VERSION)
	@"$$(go env GOPATH)/bin/eapi" --config eapi.yaml
	@npx --yes @redocly/cli@$(REDOCLY_VERSION) lint api/docs/openapi.json
	@npx --yes @redocly/cli@$(REDOCLY_VERSION) build-docs api/docs/openapi.json --output api/docs/index.html

build.api:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@chmod +x $(SCRIPT_PATH)/build/*.sh
	@cd $(APP_PATH) && $(SCRIPT_PATH)/build/gobuild.sh $(APP_NAME) $(COMPILE_OUT)
	@echo -e "\n"

build.dist:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@rm -rf $(APP_PATH)/api/internal/ui/dist
	@mv $(APP_PATH)/ui/dist $(APP_PATH)/api/internal/ui/dist
	@echo -e "\n"

build.ui:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@cd $(APP_PATH)/ui && yarn install --frozen-lockfile && yarn run build
	@echo -e "\n"

build.ui-v2:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@cd $(APP_PATH)/ui-v2 && npm install && npm run build
	@echo -e "\n"

docker:docker.build docker.push

docker.build:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@docker build -t $(HUB_USER)/clickvisual:latest .
	@echo -e "\n"

docker.push:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@docker push $(HUB_USER)/clickvisual:latest
	@echo -e "\n"

docker.clean:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@rm -rf $(ROOT)/data/all-in-one/clickhouse/database
	@rm -rf $(ROOT)/data/all-in-one/kafka/data
	@rm -rf $(ROOT)/data/all-in-one/zookeeper/data
	@rm -rf $(ROOT)/data/all-in-one/zookeeper/datalog
