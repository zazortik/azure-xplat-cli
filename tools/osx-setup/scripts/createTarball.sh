#!/bin/sh
# Microsoft Azure OS X Package: Tarball Creation Script
# Copyright (c) Microsoft Corporation. All Rights Reserved.
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
pushd /tmp/azureInstallerTemporary/node_modules/azure
rm -rf .git
popd

# L67-L102 are commented temporarily until the versions of azure-common
# are unified across all packages
# 
# pushd /tmp/azureInstallerTemporary/node_modules/azure
# for PACKAGE in packages test tasks examples jsdoc
# do
# 	rm -rf $PACKAGE
# done
# 
# cd lib
# rm -rf common
# 
# cd services
# packages=( gallery
# 	management
# 	computeManagement
# 	resourceManagement
# 	serviceBusManagement
# 	schedulerManagement
# 	sqlManagement
# 	storageManagement
# 	subscriptionManagement
# 	networkManagement
# 	webSiteManagement
# 	scheduler
# )
# 
# for PACKAGE in ${packages[@]}
# do
# 	rm -rf $PACKAGE
# done
# popd
# 
# pushd /tmp/azureInstallerTemporary/node_modules
# for PACKAGE in azure-gallery azure-mgmt-resource
# do
# 	rm -rf $PACKAGE/node_modules/azure-common
# done
# popd

# Remove dev dependencies from azure module
pushd /tmp/azureInstallerTemporary/node_modules/azure/node_modules
packages=( mocha jshint sinon should nock grunt grunt-jsdoc grunt-devserver )
for PACKAGE in ${packages[@]}
do
	rm -rf $PACKAGE
done
popd

# Remove dev dependencies from xplat module
pushd /tmp/azureInstallerTemporary/node_modules
packages=( mocha jshint sinon should nock winston-memory cucumber )
for PACKAGE in ${packages[@]}
do
	rm -rf $PACKAGE
done
popd

# Remove dev-time only code from xplat module
pushd /tmp/azureInstallerTemporary
dirstoremove=( features scripts test tools )
for DIR in ${dirstoremove[@]}
do
	rm -rf $DIR
done
popd

# Remove unneeded files
pushd /tmp/azureInstallerTemporary
rm -f azure_error
rm -f azure.azure_error
rm -f npm-debug.log
rm -f checkstyle-result.xml
rm -f test-result.xml
rm -f .travis.yml
rm -f .jshintrc
rm -f .gitattributes
rm -f .gitignore
rm -f ChangeLog.txt
popd

# compile streamline files
pushd /tmp/azureInstallerTemporary
node node_modules/streamline/bin/_node --verbose -c lib
node node_modules/streamline/bin/_node --verbose -c node_modules/streamline/lib/streams
node node_modules/streamline/bin/_node --verbose -c node_modules/streamline-streams/lib
popd

# generate command metadata file
pushd /tmp/azureInstallerTemporary
node bin/azure --gen
popd

# Copy licensing files
cp resources/ThirdPartyNotices.txt /tmp/azureInstallerTemporary/ThirdPartyNotices.txt
cp resources/LICENSE.rtf /tmp/azureInstallerTemporary/LICENSE.rtf
rm /tmp/azureInstallerTemporary/LICENSE.txt

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
