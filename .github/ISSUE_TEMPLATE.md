CLI Version: **0.9.X**
OS Type: Mac / Win / Linux (Ubuntu, RedHat, etc.)
Installation via:  npm / brew / win-or-mac installer / docker / github repo

Mode: **ARM / ASM**

Description:
`azure vm show` command doesn't output VM name.

Steps to reproduce:
1) Run `azure vm create ...`
2) Then run `azure vm show ...`

Error stack trace:

**Please paste the content of ~/.azure/azure.err or C:\Users\username\\.azure\azure.err over here**

If the issue is w.r.t `authentication` then please set `AZURE_ADAL_LOGGING_ENABLED=1` and then run the `azure login` command again. 
Please paste the verbose logs over here. (Make sure to delete the password before pasting the contents).

