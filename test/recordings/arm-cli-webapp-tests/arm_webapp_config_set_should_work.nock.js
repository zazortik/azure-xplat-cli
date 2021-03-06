// This file has been autogenerated.

var profile = require('../../../lib/util/profile');

exports.getMockedProfile = function () {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: '8d57ddbd-c779-40ea-b660-1015f4bf027d',
    name: 'Visual Studio Enterprise',
    user: {
      name: 'user@domain.example',
      type: 'user'
    },
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    state: 'Enabled',
    registeredProviders: [],
    _eventsCount: '1',
    isDefault: true
  }, newProfile.environments['AzureCloud']));

  return newProfile;
};

exports.setEnvironment = function() {
};

exports.scopes = [[function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .get('/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175?api-version=2015-08-01')
  .reply(200, "{\"id\":\"/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175\",\"name\":\"webappclitests4175\",\"type\":\"Microsoft.Web/sites\",\"location\":\"West US\",\"tags\":null,\"properties\":{\"name\":\"webappclitests4175\",\"state\":\"Running\",\"hostNames\":[\"webappclitests4175.azurewebsites.net\"],\"webSpace\":\"testrg18319-WestUSwebspace\",\"selfLink\":\"https://waws-prod-bay-065.api.azurewebsites.windows.net:454/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/webspaces/testrg18319-WestUSwebspace/sites/webappclitests4175\",\"repositorySiteName\":\"webappclitests4175\",\"owner\":null,\"usageState\":0,\"enabled\":true,\"adminEnabled\":true,\"enabledHostNames\":[\"webappclitests4175.azurewebsites.net\",\"webappclitests4175.scm.azurewebsites.net\"],\"siteProperties\":{\"metadata\":null,\"properties\":[],\"appSettings\":null},\"availabilityState\":0,\"sslCertificates\":null,\"csrs\":[],\"cers\":null,\"siteMode\":null,\"hostNameSslStates\":[{\"name\":\"webappclitests4175.azurewebsites.net\",\"sslState\":0,\"ipBasedSslResult\":null,\"virtualIP\":null,\"thumbprint\":null,\"toUpdate\":null,\"toUpdateIpBasedSsl\":null,\"ipBasedSslState\":0,\"hostType\":0},{\"name\":\"webappclitests4175.scm.azurewebsites.net\",\"sslState\":0,\"ipBasedSslResult\":null,\"virtualIP\":null,\"thumbprint\":null,\"toUpdate\":null,\"toUpdateIpBasedSsl\":null,\"ipBasedSslState\":0,\"hostType\":1}],\"computeMode\":null,\"serverFarm\":null,\"serverFarmId\":\"/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/serverfarms/arm-cli-webapp-tests4355\",\"reserved\":false,\"lastModifiedTimeUtc\":\"2016-09-21T17:56:55.237\",\"storageRecoveryDefaultState\":\"Running\",\"contentAvailabilityState\":0,\"runtimeAvailabilityState\":0,\"siteConfig\":null,\"deploymentId\":\"webappclitests4175\",\"trafficManagerHostNames\":null,\"sku\":\"Basic\",\"premiumAppDeployed\":null,\"scmSiteAlsoStopped\":false,\"targetSwapSlot\":null,\"hostingEnvironment\":null,\"hostingEnvironmentProfile\":null,\"microService\":\"WebSites\",\"gatewaySiteName\":null,\"clientAffinityEnabled\":true,\"clientCertEnabled\":false,\"hostNamesDisabled\":false,\"domainVerificationIdentifiers\":null,\"kind\":null,\"outboundIpAddresses\":\"40.83.179.31,40.83.181.84,40.83.183.190,40.83.183.1\",\"containerSize\":0,\"dailyMemoryTimeQuota\":0,\"suspendedTill\":null,\"siteDisabledReason\":0,\"functionExecutionUnitsCache\":null,\"maxNumberOfWorkers\":null,\"homeStamp\":\"waws-prod-bay-065\",\"cloningInfo\":null,\"hostingEnvironmentId\":null,\"tags\":null,\"resourceGroup\":\"testrg18319\",\"defaultHostName\":\"webappclitests4175.azurewebsites.net\"}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '2514',
  'content-type': 'application/json',
  expires: '-1',
  etag: '"1D214318A3CF750"',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'cf1936b7-ac03-4177-9ff2-00f052dbf094',
  server: 'Microsoft-IIS/8.0',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-reads': '14999',
  'x-ms-correlation-request-id': 'ab0b6068-4aa8-4af6-81ab-fa9c41fd1e89',
  'x-ms-routing-request-id': 'CENTRALUS:20160921T175702Z:ab0b6068-4aa8-4af6-81ab-fa9c41fd1e89',
  date: 'Wed, 21 Sep 2016 17:57:02 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .get('/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175?api-version=2015-08-01')
  .reply(200, "{\"id\":\"/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175\",\"name\":\"webappclitests4175\",\"type\":\"Microsoft.Web/sites\",\"location\":\"West US\",\"tags\":null,\"properties\":{\"name\":\"webappclitests4175\",\"state\":\"Running\",\"hostNames\":[\"webappclitests4175.azurewebsites.net\"],\"webSpace\":\"testrg18319-WestUSwebspace\",\"selfLink\":\"https://waws-prod-bay-065.api.azurewebsites.windows.net:454/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/webspaces/testrg18319-WestUSwebspace/sites/webappclitests4175\",\"repositorySiteName\":\"webappclitests4175\",\"owner\":null,\"usageState\":0,\"enabled\":true,\"adminEnabled\":true,\"enabledHostNames\":[\"webappclitests4175.azurewebsites.net\",\"webappclitests4175.scm.azurewebsites.net\"],\"siteProperties\":{\"metadata\":null,\"properties\":[],\"appSettings\":null},\"availabilityState\":0,\"sslCertificates\":null,\"csrs\":[],\"cers\":null,\"siteMode\":null,\"hostNameSslStates\":[{\"name\":\"webappclitests4175.azurewebsites.net\",\"sslState\":0,\"ipBasedSslResult\":null,\"virtualIP\":null,\"thumbprint\":null,\"toUpdate\":null,\"toUpdateIpBasedSsl\":null,\"ipBasedSslState\":0,\"hostType\":0},{\"name\":\"webappclitests4175.scm.azurewebsites.net\",\"sslState\":0,\"ipBasedSslResult\":null,\"virtualIP\":null,\"thumbprint\":null,\"toUpdate\":null,\"toUpdateIpBasedSsl\":null,\"ipBasedSslState\":0,\"hostType\":1}],\"computeMode\":null,\"serverFarm\":null,\"serverFarmId\":\"/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/serverfarms/arm-cli-webapp-tests4355\",\"reserved\":false,\"lastModifiedTimeUtc\":\"2016-09-21T17:56:55.237\",\"storageRecoveryDefaultState\":\"Running\",\"contentAvailabilityState\":0,\"runtimeAvailabilityState\":0,\"siteConfig\":null,\"deploymentId\":\"webappclitests4175\",\"trafficManagerHostNames\":null,\"sku\":\"Basic\",\"premiumAppDeployed\":null,\"scmSiteAlsoStopped\":false,\"targetSwapSlot\":null,\"hostingEnvironment\":null,\"hostingEnvironmentProfile\":null,\"microService\":\"WebSites\",\"gatewaySiteName\":null,\"clientAffinityEnabled\":true,\"clientCertEnabled\":false,\"hostNamesDisabled\":false,\"domainVerificationIdentifiers\":null,\"kind\":null,\"outboundIpAddresses\":\"40.83.179.31,40.83.181.84,40.83.183.190,40.83.183.1\",\"containerSize\":0,\"dailyMemoryTimeQuota\":0,\"suspendedTill\":null,\"siteDisabledReason\":0,\"functionExecutionUnitsCache\":null,\"maxNumberOfWorkers\":null,\"homeStamp\":\"waws-prod-bay-065\",\"cloningInfo\":null,\"hostingEnvironmentId\":null,\"tags\":null,\"resourceGroup\":\"testrg18319\",\"defaultHostName\":\"webappclitests4175.azurewebsites.net\"}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '2514',
  'content-type': 'application/json',
  expires: '-1',
  etag: '"1D214318A3CF750"',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'cf1936b7-ac03-4177-9ff2-00f052dbf094',
  server: 'Microsoft-IIS/8.0',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-reads': '14999',
  'x-ms-correlation-request-id': 'ab0b6068-4aa8-4af6-81ab-fa9c41fd1e89',
  'x-ms-routing-request-id': 'CENTRALUS:20160921T175702Z:ab0b6068-4aa8-4af6-81ab-fa9c41fd1e89',
  date: 'Wed, 21 Sep 2016 17:57:02 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175/config/web?api-version=2015-08-01', '*')
  .reply(200, "{\"id\":\"/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175\",\"name\":\"webappclitests4175\",\"type\":\"Microsoft.Web/sites\",\"location\":\"West US\",\"tags\":null,\"properties\":{\"numberOfWorkers\":1,\"defaultDocuments\":[\"Default.htm\",\"Default.html\",\"Default.asp\",\"index.htm\",\"index.html\",\"iisstart.htm\",\"default.aspx\",\"index.php\",\"hostingstart.html\"],\"netFrameworkVersion\":\"v4.0\",\"phpVersion\":\"7.0\",\"pythonVersion\":\"\",\"nodeVersion\":\"\",\"requestTracingEnabled\":false,\"remoteDebuggingEnabled\":false,\"remoteDebuggingVersion\":null,\"httpLoggingEnabled\":false,\"logsDirectorySizeLimit\":35,\"detailedErrorLoggingEnabled\":false,\"publishingUsername\":\"$webappclitests4175\",\"publishingPassword\":null,\"appSettings\":null,\"metadata\":null,\"connectionStrings\":null,\"machineKey\":null,\"handlerMappings\":null,\"documentRoot\":null,\"scmType\":\"None\",\"use32BitWorkerProcess\":true,\"webSocketsEnabled\":false,\"alwaysOn\":false,\"javaVersion\":null,\"javaContainer\":null,\"javaContainerVersion\":null,\"appCommandLine\":\"\",\"managedPipelineMode\":0,\"virtualApplications\":[{\"virtualPath\":\"/\",\"physicalPath\":\"site\\\\wwwroot\",\"preloadEnabled\":false,\"virtualDirectories\":null}],\"winAuthAdminState\":0,\"winAuthTenantState\":0,\"customAppPoolIdentityAdminState\":false,\"customAppPoolIdentityTenantState\":false,\"runtimeADUser\":null,\"runtimeADUserPassword\":null,\"loadBalancing\":1,\"routingRules\":[],\"experiments\":{\"rampUpRules\":[]},\"limits\":null,\"autoHealEnabled\":false,\"autoHealRules\":{\"triggers\":null,\"actions\":null},\"tracingOptions\":null,\"vnetName\":\"\",\"siteAuthEnabled\":false,\"siteAuthSettings\":{\"enabled\":null,\"httpApiPrefixPath\":null,\"unauthenticatedClientAction\":null,\"tokenStoreEnabled\":null,\"allowedExternalRedirectUrls\":null,\"defaultProvider\":null,\"clientId\":null,\"clientSecret\":null,\"issuer\":null,\"allowedAudiences\":null,\"additionalLoginParams\":null,\"isAadAutoProvisioned\":false,\"googleClientId\":null,\"googleClientSecret\":null,\"googleOAuthScopes\":null,\"facebookAppId\":null,\"facebookAppSecret\":null,\"facebookOAuthScopes\":null,\"twitterConsumerKey\":null,\"twitterConsumerSecret\":null,\"microsoftAccountClientId\":null,\"microsoftAccountClientSecret\":null,\"microsoftAccountOAuthScopes\":null},\"cors\":null,\"push\":null,\"apiDefinition\":null,\"autoSwapSlotName\":null,\"localMySqlEnabled\":false,\"ipSecurityRestrictions\":null}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '2325',
  'content-type': 'application/json',
  expires: '-1',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'f14e363b-0f22-4180-a77d-896a4e9198c1',
  server: 'Microsoft-IIS/8.0',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-writes': '1199',
  'x-ms-correlation-request-id': '1c7eb368-d940-4077-a0c4-1c02f7332db4',
  'x-ms-routing-request-id': 'CENTRALUS:20160921T175704Z:1c7eb368-d940-4077-a0c4-1c02f7332db4',
  date: 'Wed, 21 Sep 2016 17:57:03 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175/config/web?api-version=2015-08-01', '*')
  .reply(200, "{\"id\":\"/subscriptions/8d57ddbd-c779-40ea-b660-1015f4bf027d/resourceGroups/testrg18319/providers/Microsoft.Web/sites/webappclitests4175\",\"name\":\"webappclitests4175\",\"type\":\"Microsoft.Web/sites\",\"location\":\"West US\",\"tags\":null,\"properties\":{\"numberOfWorkers\":1,\"defaultDocuments\":[\"Default.htm\",\"Default.html\",\"Default.asp\",\"index.htm\",\"index.html\",\"iisstart.htm\",\"default.aspx\",\"index.php\",\"hostingstart.html\"],\"netFrameworkVersion\":\"v4.0\",\"phpVersion\":\"7.0\",\"pythonVersion\":\"\",\"nodeVersion\":\"\",\"requestTracingEnabled\":false,\"remoteDebuggingEnabled\":false,\"remoteDebuggingVersion\":null,\"httpLoggingEnabled\":false,\"logsDirectorySizeLimit\":35,\"detailedErrorLoggingEnabled\":false,\"publishingUsername\":\"$webappclitests4175\",\"publishingPassword\":null,\"appSettings\":null,\"metadata\":null,\"connectionStrings\":null,\"machineKey\":null,\"handlerMappings\":null,\"documentRoot\":null,\"scmType\":\"None\",\"use32BitWorkerProcess\":true,\"webSocketsEnabled\":false,\"alwaysOn\":false,\"javaVersion\":null,\"javaContainer\":null,\"javaContainerVersion\":null,\"appCommandLine\":\"\",\"managedPipelineMode\":0,\"virtualApplications\":[{\"virtualPath\":\"/\",\"physicalPath\":\"site\\\\wwwroot\",\"preloadEnabled\":false,\"virtualDirectories\":null}],\"winAuthAdminState\":0,\"winAuthTenantState\":0,\"customAppPoolIdentityAdminState\":false,\"customAppPoolIdentityTenantState\":false,\"runtimeADUser\":null,\"runtimeADUserPassword\":null,\"loadBalancing\":1,\"routingRules\":[],\"experiments\":{\"rampUpRules\":[]},\"limits\":null,\"autoHealEnabled\":false,\"autoHealRules\":{\"triggers\":null,\"actions\":null},\"tracingOptions\":null,\"vnetName\":\"\",\"siteAuthEnabled\":false,\"siteAuthSettings\":{\"enabled\":null,\"httpApiPrefixPath\":null,\"unauthenticatedClientAction\":null,\"tokenStoreEnabled\":null,\"allowedExternalRedirectUrls\":null,\"defaultProvider\":null,\"clientId\":null,\"clientSecret\":null,\"issuer\":null,\"allowedAudiences\":null,\"additionalLoginParams\":null,\"isAadAutoProvisioned\":false,\"googleClientId\":null,\"googleClientSecret\":null,\"googleOAuthScopes\":null,\"facebookAppId\":null,\"facebookAppSecret\":null,\"facebookOAuthScopes\":null,\"twitterConsumerKey\":null,\"twitterConsumerSecret\":null,\"microsoftAccountClientId\":null,\"microsoftAccountClientSecret\":null,\"microsoftAccountOAuthScopes\":null},\"cors\":null,\"push\":null,\"apiDefinition\":null,\"autoSwapSlotName\":null,\"localMySqlEnabled\":false,\"ipSecurityRestrictions\":null}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '2325',
  'content-type': 'application/json',
  expires: '-1',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'f14e363b-0f22-4180-a77d-896a4e9198c1',
  server: 'Microsoft-IIS/8.0',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-writes': '1199',
  'x-ms-correlation-request-id': '1c7eb368-d940-4077-a0c4-1c02f7332db4',
  'x-ms-routing-request-id': 'CENTRALUS:20160921T175704Z:1c7eb368-d940-4077-a0c4-1c02f7332db4',
  date: 'Wed, 21 Sep 2016 17:57:03 GMT',
  connection: 'close' });
 return result; }]];