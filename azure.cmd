@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\bin\azure" %*
) ELSE (
  node  "%~dp0\bin\azure" %*
)