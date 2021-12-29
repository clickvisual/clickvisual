SHELL:=/bin/bash
ROOT:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
APP_NAME:=$(shell basename $(ROOT))
APP_PATH=$(ROOT)
SCRIPT_PATH:=$(APP_PATH)/scripts
