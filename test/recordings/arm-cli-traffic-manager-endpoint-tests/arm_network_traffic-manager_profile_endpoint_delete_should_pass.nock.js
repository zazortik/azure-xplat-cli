// This file has been autogenerated.

var profile = require('../../../lib/util/profile');

exports.getMockedProfile = function () {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: 'bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948',
    managementCertificate: {
      key: 'mockedKey',
      cert: 'mockedCert'
    },
    name: 'CollaberaInteropTest',
    user: {
      name: 'user@domain.example',
      type: 'user'
    },
    registeredProviders: [],
    isDefault: true
  }, newProfile.environments['AzureCloud']));

  return newProfile;
};

exports.setEnvironment = function() {
  process.env['AZURE_VM_TEST_LOCATION'] = 'eastus';
};

exports.scopes = [[function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .get('/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGTMPEndpt/providers/microsoft.network/trafficmanagerprofiles/xplatTestTMPE?api-version=2015-04-28-preview')
  .reply(200, "{\"id\":\"\\/subscriptions\\/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948\\/resourceGroups\\/xplattestgtmpendpt\\/providers\\/Microsoft.Network\\/trafficManagerProfiles\\/xplatTestTMPE\",\"name\":\"xplatTestTMPE\",\"type\":\"Microsoft.Network\\/trafficManagerProfiles\",\"location\":\"global\",\"tags\":{},\"properties\":{\"profileStatus\":\"Enabled\",\"trafficRoutingMethod\":\"Performance\",\"dnsConfig\":{\"relativeName\":\"xplattmpendptdns\",\"fqdn\":\"xplattmpendptdns.trafficmanager.net\",\"ttl\":300},\"monitorConfig\":{\"profileMonitorStatus\":null,\"protocol\":\"HTTP\",\"port\":80,\"path\":\"\\/index.html\"},\"endpoints\":[{\"id\":\"\\/subscriptions\\/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948\\/resourceGroups\\/xplattestgtmpendpt\\/providers\\/Microsoft.Network\\/trafficManagerProfiles\\/xplatTestTMPE\\/externalEndpoints\\/xplatTestTMPEndPoint\",\"name\":\"xplatTestTMPEndPoint\",\"type\":\"Microsoft.Network\\/trafficManagerProfiles\\/externalEndpoints\",\"properties\":{\"endpointStatus\":\"Disabled\",\"endpointMonitorStatus\":null,\"target\":\"xplattmpendptdns.foo.com\",\"weight\":120,\"priority\":300,\"endpointLocation\":null}}]}}", { 'cache-control': 'private',
  'content-length': '1031',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-ms-request-id': 'e2518305-bf7f-4e75-8f0b-22e118d5df3d',
  server: 'Microsoft-IIS/7.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-resource-requests': '10798',
  'x-ms-correlation-request-id': '8ae2229b-5530-4545-a466-bb9038c3f56f',
  'x-ms-routing-request-id': 'SOUTHEASTASIA:20150521T083212Z:8ae2229b-5530-4545-a466-bb9038c3f56f',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  date: 'Thu, 21 May 2015 08:32:11 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .get('/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGTMPEndpt/providers/microsoft.network/trafficmanagerprofiles/xplatTestTMPE?api-version=2015-04-28-preview')
  .reply(200, "{\"id\":\"\\/subscriptions\\/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948\\/resourceGroups\\/xplattestgtmpendpt\\/providers\\/Microsoft.Network\\/trafficManagerProfiles\\/xplatTestTMPE\",\"name\":\"xplatTestTMPE\",\"type\":\"Microsoft.Network\\/trafficManagerProfiles\",\"location\":\"global\",\"tags\":{},\"properties\":{\"profileStatus\":\"Enabled\",\"trafficRoutingMethod\":\"Performance\",\"dnsConfig\":{\"relativeName\":\"xplattmpendptdns\",\"fqdn\":\"xplattmpendptdns.trafficmanager.net\",\"ttl\":300},\"monitorConfig\":{\"profileMonitorStatus\":null,\"protocol\":\"HTTP\",\"port\":80,\"path\":\"\\/index.html\"},\"endpoints\":[{\"id\":\"\\/subscriptions\\/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948\\/resourceGroups\\/xplattestgtmpendpt\\/providers\\/Microsoft.Network\\/trafficManagerProfiles\\/xplatTestTMPE\\/externalEndpoints\\/xplatTestTMPEndPoint\",\"name\":\"xplatTestTMPEndPoint\",\"type\":\"Microsoft.Network\\/trafficManagerProfiles\\/externalEndpoints\",\"properties\":{\"endpointStatus\":\"Disabled\",\"endpointMonitorStatus\":null,\"target\":\"xplattmpendptdns.foo.com\",\"weight\":120,\"priority\":300,\"endpointLocation\":null}}]}}", { 'cache-control': 'private',
  'content-length': '1031',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-ms-request-id': 'e2518305-bf7f-4e75-8f0b-22e118d5df3d',
  server: 'Microsoft-IIS/7.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-resource-requests': '10798',
  'x-ms-correlation-request-id': '8ae2229b-5530-4545-a466-bb9038c3f56f',
  'x-ms-routing-request-id': 'SOUTHEASTASIA:20150521T083212Z:8ae2229b-5530-4545-a466-bb9038c3f56f',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  date: 'Thu, 21 May 2015 08:32:11 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGTMPEndpt/providers/microsoft.network/trafficmanagerprofiles/xplatTestTMPE?api-version=2015-04-28-preview', '*')
  .reply(201, "{\"id\":\"\\/subscriptions\\/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948\\/resourceGroups\\/xplattestgtmpendpt\\/providers\\/Microsoft.Network\\/trafficManagerProfiles\\/xplatTestTMPE\",\"name\":\"xplatTestTMPE\",\"type\":\"Microsoft.Network\\/trafficManagerProfiles\",\"location\":\"global\",\"tags\":{},\"properties\":{\"profileStatus\":\"Enabled\",\"trafficRoutingMethod\":\"Performance\",\"dnsConfig\":{\"relativeName\":\"xplattmpendptdns\",\"fqdn\":\"xplattmpendptdns.trafficmanager.net\",\"ttl\":300},\"monitorConfig\":{\"profileMonitorStatus\":null,\"protocol\":\"HTTP\",\"port\":80,\"path\":\"\\/index.html\"},\"endpoints\":[]}}", { 'cache-control': 'private',
  'content-length': '563',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-ms-request-id': 'd6564327-c76e-4cac-a60a-6b932472b09b',
  server: 'Microsoft-IIS/7.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-resource-requests': '10798',
  'x-ms-correlation-request-id': 'ff6e297f-9345-4f5b-9914-3f375c4f43ef',
  'x-ms-routing-request-id': 'SOUTHEASTASIA:20150521T083215Z:ff6e297f-9345-4f5b-9914-3f375c4f43ef',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  date: 'Thu, 21 May 2015 08:32:14 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGTMPEndpt/providers/microsoft.network/trafficmanagerprofiles/xplatTestTMPE?api-version=2015-04-28-preview', '*')
  .reply(201, "{\"id\":\"\\/subscriptions\\/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948\\/resourceGroups\\/xplattestgtmpendpt\\/providers\\/Microsoft.Network\\/trafficManagerProfiles\\/xplatTestTMPE\",\"name\":\"xplatTestTMPE\",\"type\":\"Microsoft.Network\\/trafficManagerProfiles\",\"location\":\"global\",\"tags\":{},\"properties\":{\"profileStatus\":\"Enabled\",\"trafficRoutingMethod\":\"Performance\",\"dnsConfig\":{\"relativeName\":\"xplattmpendptdns\",\"fqdn\":\"xplattmpendptdns.trafficmanager.net\",\"ttl\":300},\"monitorConfig\":{\"profileMonitorStatus\":null,\"protocol\":\"HTTP\",\"port\":80,\"path\":\"\\/index.html\"},\"endpoints\":[]}}", { 'cache-control': 'private',
  'content-length': '563',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-ms-request-id': 'd6564327-c76e-4cac-a60a-6b932472b09b',
  server: 'Microsoft-IIS/7.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-resource-requests': '10798',
  'x-ms-correlation-request-id': 'ff6e297f-9345-4f5b-9914-3f375c4f43ef',
  'x-ms-routing-request-id': 'SOUTHEASTASIA:20150521T083215Z:ff6e297f-9345-4f5b-9914-3f375c4f43ef',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  date: 'Thu, 21 May 2015 08:32:14 GMT',
  connection: 'close' });
 return result; }]];