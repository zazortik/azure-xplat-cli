#!/bin/sh
# Windows Azure OS X Package: Tarball Creation Script
# Copyright (C) 2012 Microsoft Corporation. All Rights Reserved.
#
# This script prepares an 'archive' folder that contains the CLI 
# that is to be packaged in the Mac installer.
#
# This script is not packaged or bundled, but rather used when 
# building the package.
#

if [ ! -f ./scripts/azure ]; then
	echo Please run this from the osx folder: scripts/createTarball.sh
	exit 1
fi

if [ ! -d ./out ]; then
	mkdir ./out
fi

# Remove old files
if [ -f ./out/azure.tar.gz ]; then
	rm ./out/azure.tar.gz
	echo Removing old Azure tar.gz file
fi

if [ -f ./out/azure.tar ]; then
	rm ./out/azure.tar
	echo Removing old Azure tar file
fi

# Create a place to store this staging work.
if [ -d /tmp/azureInstallerTemporary ]; then
	echo Removing old installer staging area in /tmp/azureInstallerTemporary
	rm -rf /tmp/azureInstallerTemporary
fi

if [ -f /tmp/azure.tar.gz ]; then
	rm /tmp/azure.tar.gz
fi

if [ -f /tmp/azure.tar ]; then
	rm /tmp/azure.tar
fi

mkdir /tmp/azureInstallerTemporary

echo Preparing the temporary staging area by copying the repo...

# Temporarily copy in our local azure and azure-uninstall scripts
cp scripts/azure /tmp/azureInstallerTemporary/
cp scripts/azure-uninstall /tmp/azureInstallerTemporary/

# Copy the enlistment
cp -R -L ../../ /tmp/azureInstallerTemporary/
rm -rf /tmp/azureInstallerTemporary/.git #lazy
rm -rf /tmp/azureInstallerTemporary/tools/osx-setup/out #this very installer

# Remove extraneous junk from tarball
pushd /tmp/azureInstallerTemporary/node_modules/azure/node_modules

packages=( azure-gallery
	azure-mgmt
	azure-mgmt-compute
	azure-mgmt-resource
	azure-mgmt-scheduler
	azure-mgmt-sb
	azure-mgmt-sql
	azure-mgmt-storage
	azure-mgmt-store
	azure-mgmt-subscription
	azure-mgmt-vnet
	azure-mgmt-website
	azure-scheduler	
)
for PACKAGE in ${packages[@]}
do
	rm -rf $PACKAGE/node_modules
done
popd

pushd /tmp/azureInstallerTemporary/node_modules/azure
for PACKAGE in packages scripts test tasks examples jsdoc
do
	rm -rf $PACKAGE
done

cd lib
rm -rf common

cd services
packages=( gallery
	management
	computeManagement
	resourceManagement
	serviceBusManagement
	schedulerManagement
	sqlManagement
	storageManagement
	subscriptionManagement
	networkManagement
	webSiteManagement
	scheduler
)

for PACKAGE in ${packages[@]}
do
	rm -rf $PACKAGE
done
popd

# compile streamline files
pushd /tmp/azureInstallerTemporary
node node_modules/streamline/bin/_node --verbose -c lib
node node_modules/streamline/bin/_node --verbose -c node_modules/streamline/lib/streams
popd

# Copy licensing files
cp resources/ThirdPartyNotices.txt /tmp/azureInstallerTemporary/ThirdPartyNotices.txt
cp resources/LICENSE.rtf /tmp/azureInstallerTemporary/LICENSE.rtf

# Prepare a tarball (and also a tar)
pushd /tmp/azureInstallerTemporary/
tar -cf ../azure.tar .
cd ..
cp azure.tar azure.tar_
gzip azure.tar
mv azure.tar_ azure.tar
popd

mv /tmp/azure.tar out/
mv /tmp/azure.tar.gz out/

# Background on saving both a .tar and .tar.gz:
# - We need to ship a .tar.gz tarball to the public
# - By packaging a .tar in the setup, the installation size
#   appears accurately to the user during installation.
