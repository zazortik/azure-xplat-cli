#!/bin/bash

command -v node > /dev/null 2>&1 || { echo >&2 "You don't have node.js installed."; return 1; }
if [ $(node -v | cut -c 1-2) != "v4" ]; then
  echo >&2 "You have the wrong version of node.js installed. The version 4 is recommended."
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "${SCRIPT_DIR}"
npm install
FABRIC_CODE_DIR="$(dirname $(dirname $(dirname ${SCRIPT_DIR})))/build.prod/FabricDrop/bin/Fabric/Fabric.Code"
export SERVICE_FABRIC_DEVELOPER=true
export SERVICE_FABRIC_CODE_PATH=${FABRIC_CODE_DIR}
export SERVICE_FABRIC_MANAGED_BINARIES_PATH=${FABRIC_CODE_DIR}
sudo ln -sf "${SCRIPT_DIR}/bin/azure" /usr/local/bin/azuresfcli
cd -
