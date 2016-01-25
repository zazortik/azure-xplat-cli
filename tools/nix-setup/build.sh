#!/bin/sh
# Microsoft Azure OS X Package: Create packages script
# Copyright (c) Microsoft Corporation. All Rights Reserved.
#
# This builds the package as well as prepares the tarball file, etc.
# This script is only used at build time, it is not part of the package.
# 

CURRENT_NODE_DISTRIBUTION_VERSION=v4.2.4

# Check for Apple's PackageMaker
# ------------------------------
if [ ! -f /Applications/Utilities/PackageMaker.app/Contents/MacOS/PackageMaker ]; then
	echo PackageMaker needs to be installed in the Utilies folder on your Mac.
	echo If you do not yet have PackageMaker, please download it from the Apple Dev Center.
	echo 
	echo If you need to download it from this page:
	echo open https://developer.apple.com/downloads/index.action
	echo
	echo Look for the "Auxillary Tools for Xcode - Late July 2012" link
	echo
	echo If you already have it, just drag it into the Utilities folder since this is hard-coded in the script.
	echo 
	exit 1
fi

# Node.js validation
# ------------------
if [ ! -f /usr/local/bin/node ]; then
	echo Node.js is not installed on this machine.
	echo Please download and install it from http://nodejs.org/
	open http://nodejs.org/
	exit 1
fi

export NODE_VERSION=`/usr/local/bin/node -v`
echo The current Node.js version we are shipping is $CURRENT_NODE_DISTRIBUTION_VERSION

if [ ! "$NODE_VERSION" = "$CURRENT_NODE_DISTRIBUTION_VERSION" ]; then
	echo Your Node.js version $NODE_VERSION does not match the version to distribute.
	echo Aborting package preparation.
	exit 1
fi

# Ensure that all modules are present
# -----------------------------------
pushd ../../
echo Running npm install to make sure that all modules are present locally...
npm install
popd

# Tarball creation
# ----------------
scripts/createTarball.sh

# Node.js binary
# --------------

echo Downloading node binary from nodejs.org
download_url=http://nodejs.org/dist/${CURRENT_NODE_DISTRIBUTION_VERSION}/node-${CURRENT_NODE_DISTRIBUTION_VERSION}-darwin-x64.tar.gz  
path_to_node=node-${CURRENT_NODE_DISTRIBUTION_VERSION}-darwin-x64/bin/node

rm -f out/node.tar.gz
rm -rf out/${path_to_node}
curl -o out/node.tar.gz ${download_url}
tar xvzf out/node.tar.gz -C out/ ${path_to_node}
cp out/${path_to_node} out/

# Copy the OS node into our local out folder for packaging
echo Copied Node.js binary version $CURRENT_NODE_DISTRIBUTION_VERSION into the output folder

# OS X Package creation
# ---------------------
echo Building "Microsoft Azure SDK.pkg"
/Applications/Utilities/PackageMaker.app/Contents/MacOS/PackageMaker --doc sdk.pmdoc --out "./out/Install Command Line Interface.pkg"

echo 
echo The package has been built and can be found in the ./out/ folder.

echo
echo Important:
echo This package needs to be signed with an Apple Developer ID for the best 
echo experience of Mountain Lion and newer users. Please follow the process 
echo for this per the shipping guidelines.
echo
echo Once the package has been signed, you can then place it inside a 
echo custom disk image by running the scripts/shipImage.sh script.
echo

open ./out
