@echo off
:: Windows Azure CLI - Windows Installer - Author file components script
:: Copyright (C) Microsoft Corporation. All Rights Reserved.
::
:: This re-builds partial WiX files for use in cloning the repo after install.
:: heat.exe from the WiX toolset is used for this.
::

SET NODE_VERSION=0.10.23
SET NPM_VERSION=1.3.17

:: Add Git to the path as this should be run through a .NET command prompt
:: and not a Git bash shell... We also need the gnu toolchain (for curl & unzip)
SET PATH=%PATH%;"C:\Program Files (x86)\Git\bin;"

pushd %~dp0..\

SET NODE_DOWNLOAD_URL=http://nodejs.org/dist/v%NODE_VERSION%/node.exe
SET NPM_DOWNLOAD_URL=http://nodejs.org/dist/npm/npm-%NPM_VERSION%.zip

:CLEAN_OUTPUT_DIRECTORY
IF NOT EXIST .\out\ GOTO OUTPUT_DIRECTORY_CREATE
echo Cleaning previous build artifacts...
rmdir /s /q .\out\azure-cli
IF NOT ERRORLEVEL 0 GOTO ERROR


:OUTPUT_DIRECTORY_CREATE
REM echo Creating output directory 'out'...
REM mkdir .\out
IF NOT ERRORLEVEL 0 GOTO ERROR


SET TEMP_REPO_FOLDER=azure-cli
SET TEMP_REPO=%temp%\%TEMP_REPO_FOLDER%
IF NOT EXIST %TEMP_REPO% GOTO CLONE_REPO
echo Temporary clone of the repo already exists. Removing it...
pushd %TEMP_REPO%\..\
rmdir /s /q %TEMP_REPO_FOLDER%
popd


:CLONE_REPO
mkdir %TEMP_REPO%
echo Cloning the repo elsewhere on disk...
pushd ..\..\
robocopy . %TEMP_REPO% /MIR /XD .git tools features scripts test /NFL /NDL /NJH /NJS
IF NOT ERRORLEVEL 0 GOTO ERROR
echo.
popd

echo Downloading node and npm...
pushd %TEMP_REPO%\bin
curl -o node.exe %NODE_DOWNLOAD_URL%
IF NOT ERRORLEVEL 0 GOTO ERROR
curl -o npm.zip %NPM_DOWNLOAD_URL%
IF NOT ERRORLEVEL 0 GOTO ERROR
unzip -q npm.zip
IF NOT ERRORLEVEL 0 GOTO ERROR
del npm.zip
popd

echo Running npm update...
pushd %TEMP_REPO%
CALL bin/npm.cmd update
echo.
echo IF YOU SEE A FAILURE AT THE BOTTOM OF THE NPM OUTPUT:
echo If you do not have Node.js installed on this local machine, the Azure
echo postinstall command run by npm will fail.
echo.
echo This is fine as long as only the Azure module had this issue. Onward!
echo.
popd

echo Compiling streamline files...
pushd %TEMP_REPO%
.\bin\node.exe node_modules\streamline\bin\_node --verbose -c lib
.\bin\node.exe node_modules\streamline\bin\_node --verbose -c node_modules\streamline\lib\streams
popd

echo Removing redundant azure-common copies...
pushd %TEMP_REPO%\node_modules\azure\node_modules
rmdir /s/q azure-gallery\node_modules
rmdir /s/q azure-mgmt\node_modules
rmdir /s/q azure-mgmt-compute\node_modules
rmdir /s/q azure-mgmt-resource\node_modules
rmdir /s/q azure-mgmt-scheduler\node_modules
rmdir /s/q azure-mgmt-sb\node_modules
rmdir /s/q azure-mgmt-sql\node_modules
rmdir /s/q azure-mgmt-storage\node_modules
rmdir /s/q azure-mgmt-store\node_modules
rmdir /s/q azure-mgmt-subscription\node_modules
rmdir /s/q azure-mgmt-vnet\node_modules
rmdir /s/q azure-mgmt-website\node_modules
rmdir /s/q azure-scheduler\node_modules
popd

echo Removing unneeded files from azure module...
pushd %TEMP_REPO%\node_modules\azure
rd /s/q packages
rd /s/q scripts
rd /s/q test
rd /s/q tasks
rd /s/q examples
rd /s/q jsdoc

cd lib
rd /s/q common

cd services
rd /s/q gallery
rd /s/q management
rd /s/q computeManagement
rd /s/q resourceManagement
rd /s/q serviceBusManagement
rd /s/q schedulerManagement
rd /s/q sqlManagement
rd /s/q storageManagement
rd /s/q storeManagement
rd /s/q subscriptionManagement
rd /s/q networkManagement
rd /s/q webSiteManagement
rd /s/q scheduler

popd

echo Removing unncessary files from the enlistment for the CLI to function...
:: This is cleaner than using /EXCLUDE:... commands and easier to see line-by-line...
pushd %TEMP_REPO%
rmdir /s /q .idea
rmdir /s /q __temp
del /q *.md
del *.git*
del *.npm*
del azure_error
del azure.err
del checkstyle-result.xml
del test-result.xml
del .travis.yml
del .jshintrc
del .gitattributes
del .gitignore
del ChangeLog.txt
cd bin
rmdir /s /q node_modules
del npm.cmd
echo.
popd

echo Creating the wbin (Windows binaries) folder that will be added to the path...
echo Adding license documents...
mkdir %TEMP_REPO%\wbin
copy .\scripts\azure.cmd %TEMP_REPO%\wbin\
IF NOT ERRORLEVEL 0 GOTO ERROR

copy ..\resources\*.rtf %TEMP_REPO%
IF NOT ERRORLEVEL 0 GOTO ERROR

echo.

:SUCCESS
echo Looks good.

goto END

:ERROR
echo Something happened. And this script just can't continue.
set ERRORLEVEL=1

:END
popd
