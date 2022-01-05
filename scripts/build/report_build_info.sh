#!/bin/bash

# WARNING: DO NOT EDIT, THIS FILE IS PROBABLY A COPY
#
# The original version of this file is located in the https://github.com/istio/common-files repo.
# If you're looking at this file in a different repo and want to make a change, please go to the
# common-files repo, make the change there and check it in. Then come back to this repo and run
# "make update-common".

# Copyright Istio Authors
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
APP_NAME=${1:?"app name"}

if BUILD_GIT_REVISION=$(git rev-parse HEAD 2> /dev/null); then
  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    BUILD_GIT_REVISION=${BUILD_GIT_REVISION}"-dirty"
  fi
else
  BUILD_GIT_REVISION=unknown
fi

# Check for local changes
if git diff-index --quiet HEAD --; then
  tree_status="Clean"
else
  tree_status="Modified"
fi

# XXX This needs to be updated to accomodate tags added after building, rather than prior to builds
RELEASE_TAG=$(git describe --match '[0-9]*\.[0-9]*\.[0-9]*' --exact-match 2> /dev/null || echo "")

# security wanted VERSION='unknown'
VERSION="${BUILD_GIT_REVISION}"
if [[ -n "${RELEASE_TAG}" ]]; then
  VERSION="${RELEASE_TAG}"
fi

GIT_DESCRIBE_TAG=$(git describe --match '[0-9]*\.[0-9]*\.[0-9]*' --exact-match 2> /dev/null || echo "")

# used by common/scripts/gobuild.sh
# used by scripts/build/gobuild.sh
EGO_APP_PKG="github.com/gotomicro/ego/core/eapp"
echo "${EGO_APP_PKG}.appName=${APP_NAME}"
echo "${EGO_APP_PKG}.buildVersion=${VERSION}"
echo "${EGO_APP_PKG}.buildAppVersion=${BUILD_GIT_REVISION}"
echo "${EGO_APP_PKG}.buildStatus=${tree_status}"
echo "${EGO_APP_PKG}.buildTag=${GIT_DESCRIBE_TAG}"
echo "${EGO_APP_PKG}.buildUser=$(whoami)"
echo "${EGO_APP_PKG}.buildHost=$(hostname -f)"
echo "${EGO_APP_PKG}.buildTime=$(date '+%Y-%m-%d--%T')"


