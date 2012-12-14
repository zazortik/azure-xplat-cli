::
:: Windows Azure CLI - Windows Installer - Author file components script
:: Copyright (C) Microsoft Corporation. All Rights Reserved.
::

@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\bin\azure" %*
) ELSE (
  node  "%~dp0\..\bin\azure" %*
)
