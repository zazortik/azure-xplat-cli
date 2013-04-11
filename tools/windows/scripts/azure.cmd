::
:: Windows Azure CLI - Windows Installer - Author file components script
:: Copyright (C) Microsoft Corporation. All Rights Reserved.
::

@SET PRECOMPILE_STREAMLINE_FILES=1
@IF EXIST "%~dp0\..\bin\node.exe" (
  "%~dp0\..\bin\node.exe"  "%~dp0\..\bin\azure" %*
) ELSE (
  node  "%~dp0\..\bin\azure" %*
)
@SET PRECOMPILE_STREAMLINE_FILES=
