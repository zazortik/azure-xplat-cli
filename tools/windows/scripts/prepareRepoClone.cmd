@echo off
:: Windows Azure CLI - Windows Installer - Author file components script
:: Copyright (C) Microsoft Corporation. All Rights Reserved.
:: 
:: This re-builds partial WiX files for use in cloning the repo after install. 
:: heat.exe from the WiX toolset is used for this.
:: 

SET NODE_VERSION=0.6.17
:: We're using Node 0.6.17 for testing, etc.
:: http://nodejs.org/dist/v0.6.17/

:: Add Git to the path as this should be run through a .NET command prompt 
:: and not a Git bash shell...
SET PATH=%PATH%;"C:\Program Files (x86)\Git\bin"

pushd %~dp0..\

SET PRIVATE_REPO_NAME=azure-sdk-for-net-installer
SET PRIVATE_REPO_FOLDER=%~dp0..\..\..\..\%PRIVATE_REPO_NAME%\Binaries\

SET FIXED_NODE_DISTRIBUTION=%PRIVATE_REPO_FOLDER%node\v%NODE_VERSION%\


IF EXIST %PRIVATE_REPO_FOLDER% GOTO PRIVATE_REPO_EXISTS
echo Private repository %PRIVATE_REPO_NAME% not found.
echo There are binaries and other support files for the Windows Installer 
echo build.
echo.
echo Please check your permissions and clone %PRIVATE_REPO_NAME% as a peer of 
echo the xplat repo.
echo.
echo If you do not have repo access, you can easily support building 
echo by downloading Wix 3.6 and the supported Node version above and 
echo placing its binaries in the appropriate matching folders.
echo.
goto ERROR


:PRIVATE_REPO_EXISTS
IF EXIST %FIXED_NODE_DISTRIBUTION%node.exe GOTO PRIVATE_NODE_EXISTS
echo Error: The fixed Node version does not exist.
echo Folder: %FIXED_NODE_DISTRIBUTION%
goto ERROR
:PRIVATE_NODE_EXISTS


:CHECK_OUTPUT_DIRECTORY
REM echo This build will contain this Node version:
REM %FIXED_NODE_DISTRIBUTION%\node.exe -v
REM echo.


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
xcopy . %TEMP_REPO%\ /E /Q /EXCLUDE:tools\windows\scripts\xcopy-exclude.txt
IF NOT ERRORLEVEL 0 GOTO ERROR
echo.
popd


echo Running npm update...
pushd %TEMP_REPO%
CALL %FIXED_NODE_DISTRIBUTION%npm.cmd update
echo.
echo IF YOU SEE A FAILURE AT THE BOTTOM OF THE NPM OUTPUT:
echo If you do not have Node.js installed on this local machine, the Azure 
echo postinstall command run by npm will fail.
echo.
echo This is fine as long as only the Azure module had this issue. Onward!
echo.
popd


echo Removing unncessary files from the enlistment for the CLI to function...
:: This is cleaner than using /EXCLUDE:... commands and easier to see line-by-line...
pushd %TEMP_REPO%
rmdir /s /q test
REM rmdir /s /q tools
del /q *.md
del *.git*
del *.npm*
del ChangeLog.txt
echo.
popd


echo Creating the wbin (Windows binaries) folder that will be added to the path...
echo Adding license documents...
mkdir %TEMP_REPO%\wbin
copy .\scripts\azure.cmd %TEMP_REPO%\wbin\
IF NOT ERRORLEVEL 0 GOTO ERROR

echo Copying Node.exe...
copy %FIXED_NODE_DISTRIBUTION%node.exe %TEMP_REPO%\wbin\
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
