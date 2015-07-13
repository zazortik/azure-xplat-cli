::
:: Microsoft Azure CLI - scripts to disable tracing through fiddler
:: Copyright (C) Microsoft Corporation. All Rights Reserved.
::

::delete all cli's access tokens saved in the local security store.
..\..\..\bin\windows\creds.exe -d -t AzureXplatCli:target=* -g