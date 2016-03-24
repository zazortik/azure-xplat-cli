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

set -e
if [ ! -f ./scripts/azure ]; then
	echo Please run this from the osx folder: scripts/createTarball.sh
	exit 1
fi

rm -rf "./out" "/tmp/azureInstallerTemporary" "/tmp/azure-linux" "tmp/azure.tar*" "/tmp/azure.linux*"
mkdir "./out" "/tmp/azureInstallerTemporary" "/tmp/azure-linux"

echo Preparing the temporary staging area by copying the repo...

# Temporarily copy in our local azure and azure-uninstall scripts
cp scripts/azure /tmp/azureInstallerTemporary/
cp scripts/azure-uninstall /tmp/azureInstallerTemporary/

# Copy the enlistment
cp -R -L ../../ /tmp/azureInstallerTemporary/
rm -rf /tmp/azureInstallerTemporary/.git #lazy
rm -rf /tmp/azureInstallerTemporary/tools/nix-setup/out #this very installer

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
dirstoremove=( features scripts test tools Documentation )
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
rm -f *.njsproj
rm -f *.sln
popd

# compile streamline files
pushd /tmp/azureInstallerTemporary
node node_modules/streamline/bin/_node --verbose -c lib
node node_modules/streamline/bin/_node --verbose -c node_modules/streamline/lib/streams
node node_modules/streamline/bin/_node --verbose -c node_modules/streamline-streams/lib
find lib/ -name "*._js" -delete
find . -name ".ntvs_analysis.dat" -delete
popd

# generate command metadata file
pushd /tmp/azureInstallerTemporary
node bin/azure --gen
popd

# Copy licensing files
cp resources/ThirdPartyNotices.txt /tmp/azureInstallerTemporary/ThirdPartyNotices.txt
cp resources/LICENSE.rtf /tmp/azureInstallerTemporary/LICENSE.rtf
rm /tmp/azureInstallerTemporary/LICENSE.txt

#Clone to be used for linux tarball. Same with
#osx tarball except having node_modules removed. 
cp -R /tmp/azureInstallerTemporary/ /tmp/azure-linux
pushd /tmp/azure-linux
rm -rf node_modules
tar -cf ../azure.linux.tar .
cd ..
gzip azure.linux.tar
popd
mv /tmp/azure.linux.tar.gz out/

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
