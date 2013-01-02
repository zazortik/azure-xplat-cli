@echo off
echo Building the Windows Installer...
echo NOTE: This needs to be run from a .NET developer command prompt with msbuild in the path.
echo.

pushd %~dp0

echo Creating a local close of the current repo bits...
CALL scripts\prepareRepoClone.cmd

echo Building MSI...
msbuild /t:rebuild /p:Configuration=Release

echo.
start .\out\

popd
