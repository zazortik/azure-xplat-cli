::
:: Microsoft Azure CLI - delete all cli's access tokens saved 
:: in the local security store.
:: Copyright (C) Microsoft Corporation. All Rights Reserved.
::

%~dp0..\..\..\bin\windows\creds.exe -d -t AzureXplatCli:target=* -g