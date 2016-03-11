### Getting Endpoints for Azure

- **Listing different public environments**
```bash
D:\sdk>azure account env list
info:    Executing command account env list
data:    Name
data:    -----------------
data:    AzureCloud
data:    AzureChinaCloud
data:    AzureUSGovernment
info:    account env list command OK
```

- **Getting all the endpoints supported by the public environment**
```bash
D:\sdk>azure account env show AzureCloud
info:    Executing command account env show
data:    Name:                                              AzureCloud
data:    activeDirectoryEndpointUrl:                        https://login.microsoftonline.com
data:    activeDirectoryGraphApiVersion:                    2013-04-05
data:    activeDirectoryGraphResourceId:                    https://graph.windows.net/
data:    activeDirectoryResourceId:                         https://management.core.windows.net/
data:    azureDataLakeAnalyticsCatalogAndJobEndpointSuffix: azuredatalakeanalytics.net
data:    azureDataLakeStoreFileSystemEndpointSuffix:        azuredatalakestore.net
data:    galleryEndpointUrl:                                https://gallery.azure.com/
data:    isPublicEnvironment:                               true
data:    keyVaultDnsSuffix:                                 .vault.azure.net
data:    managementEndpointUrl:                             https://management.core.windows.net
data:    portalUrl:                                         http://go.microsoft.com/fwlink/?LinkId=254433
data:    publishingProfileUrl:                              http://go.microsoft.com/fwlink/?LinkId=254432
data:    resourceManagerEndpointUrl:                        https://management.azure.com/
data:    sqlManagementEndpointUrl:                          https://management.core.windows.net:8443/
data:    sqlServerHostnameSuffix:                           .database.windows.net
data:    storageEndpointSuffix:                             .core.windows.net
info:    account env show command OK
```
