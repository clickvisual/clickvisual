APP_NAME:=mogo
SHELL:=/bin/bash
ROOT:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
APP_PATH=$(ROOT)/api
SCRIPT_PATH:=$(APP_PATH)/../scripts
COMPILE_OUT:=$(APP_PATH)/../bin/$(APP_NAME)

build: build.api build.ui

build.api:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@chmod +x $(SCRIPT_PATH)/build/*.sh
	@cd $(APP_PATH) && $(SCRIPT_PATH)/build/gobuild.sh $(APP_NAME) $(COMPILE_OUT)
	@echo -e "\n"

build.ui:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@cd $(APP_PATH)/../ui && yarn install --frozen-lockfile &&  yarn run build
	@echo -e "\n"

docker.build:
	@echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>making $@<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
	@docker build -t mogo:latest .
	@echo -e "\n"