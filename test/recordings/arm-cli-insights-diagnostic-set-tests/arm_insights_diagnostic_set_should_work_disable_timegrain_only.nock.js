// This file has been autogenerated.

var profile = require('../../../lib/util/profile');

exports.getMockedProfile = function () {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: '4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c',
    name: 'Insights Org Sub2',
    user: {
      name: 'user@domain.example',
      type: 'user'
    },
    tenantId: 'e58d7273-6738-4be8-9c6e-82863ed7b695',
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
  .get('/%2Fsubscriptions%2F4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c%2FresourceGroups%2Finsights-integration%2Fproviders%2Ftest.shoebox%2Ftestresources2%2F0000000000eastusR2/providers/microsoft.insights/diagnosticSettings/service?api-version=2015-07-01')
  .reply(200, "{\"id\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourcegroups/insights-integration/providers/test.shoebox/testresources2/0000000000eastusr2/diagnosticSettings/service\",\"type\":null,\"name\":\"service\",\"location\":null,\"tags\":null,\"properties\":{\"storageAccountId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/insights-integration/providers/microsoft.classicstorage/storageAccounts/sbeastus1a1\",\"serviceBusRuleId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/Default-ServiceBus-EastUS/providers/Microsoft.ServiceBus/namespaces/tseastus/authorizationrules/RootManageSharedAccessKey\",\"metrics\":[{\"timeGrain\":\"PT1M\",\"enabled\":true,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}],\"logs\":[{\"category\":\"TestLog1\",\"enabled\":false,\"retentionPolicy\":{\"enabled\":false,\"days\":0}},{\"category\":\"TestLog2\",\"enabled\":true,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}]}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '905',
  'content-type': 'application/json; charset=utf-8',
  expires: '-1',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': '4aa4fac1-0900-433e-ae2a-e56d8f2e679c',
  server: 'Microsoft-IIS/8.5',
  'x-ms-ratelimit-remaining-subscription-reads': '14981',
  'x-ms-correlation-request-id': '987f3214-ee6d-40f5-849d-9233e8ac1588',
  'x-ms-routing-request-id': 'CENTRALUS:20160718T210233Z:987f3214-ee6d-40f5-849d-9233e8ac1588',
  date: 'Mon, 18 Jul 2016 21:02:32 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .get('/%2Fsubscriptions%2F4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c%2FresourceGroups%2Finsights-integration%2Fproviders%2Ftest.shoebox%2Ftestresources2%2F0000000000eastusR2/providers/microsoft.insights/diagnosticSettings/service?api-version=2015-07-01')
  .reply(200, "{\"id\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourcegroups/insights-integration/providers/test.shoebox/testresources2/0000000000eastusr2/diagnosticSettings/service\",\"type\":null,\"name\":\"service\",\"location\":null,\"tags\":null,\"properties\":{\"storageAccountId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/insights-integration/providers/microsoft.classicstorage/storageAccounts/sbeastus1a1\",\"serviceBusRuleId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/Default-ServiceBus-EastUS/providers/Microsoft.ServiceBus/namespaces/tseastus/authorizationrules/RootManageSharedAccessKey\",\"metrics\":[{\"timeGrain\":\"PT1M\",\"enabled\":true,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}],\"logs\":[{\"category\":\"TestLog1\",\"enabled\":false,\"retentionPolicy\":{\"enabled\":false,\"days\":0}},{\"category\":\"TestLog2\",\"enabled\":true,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}]}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '905',
  'content-type': 'application/json; charset=utf-8',
  expires: '-1',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': '4aa4fac1-0900-433e-ae2a-e56d8f2e679c',
  server: 'Microsoft-IIS/8.5',
  'x-ms-ratelimit-remaining-subscription-reads': '14981',
  'x-ms-correlation-request-id': '987f3214-ee6d-40f5-849d-9233e8ac1588',
  'x-ms-routing-request-id': 'CENTRALUS:20160718T210233Z:987f3214-ee6d-40f5-849d-9233e8ac1588',
  date: 'Mon, 18 Jul 2016 21:02:32 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/%2Fsubscriptions%2F4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c%2FresourceGroups%2Finsights-integration%2Fproviders%2Ftest.shoebox%2Ftestresources2%2F0000000000eastusR2/providers/microsoft.insights/diagnosticSettings/service?api-version=2015-07-01', '*')
  .reply(200, "{\"id\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourcegroups/insights-integration/providers/test.shoebox/testresources2/0000000000eastusr2/diagnosticSettings/service\",\"type\":null,\"name\":\"service\",\"location\":null,\"tags\":null,\"properties\":{\"storageAccountId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/insights-integration/providers/microsoft.classicstorage/storageAccounts/sbeastus1a1\",\"serviceBusRuleId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/Default-ServiceBus-EastUS/providers/Microsoft.ServiceBus/namespaces/tseastus/authorizationrules/RootManageSharedAccessKey\",\"metrics\":[{\"timeGrain\":\"PT1M\",\"enabled\":false,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}],\"logs\":[{\"category\":\"TestLog1\",\"enabled\":false,\"retentionPolicy\":{\"enabled\":false,\"days\":0}},{\"category\":\"TestLog2\",\"enabled\":true,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}]}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '906',
  'content-type': 'application/json; charset=utf-8',
  expires: '-1',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'da811979-a1b4-477d-bb2b-bc40de64d2cb',
  server: 'Microsoft-IIS/8.5',
  'x-ms-ratelimit-remaining-subscription-writes': '1197',
  'x-ms-correlation-request-id': '2956b1f9-2664-488f-99a9-0a5ed9b62435',
  'x-ms-routing-request-id': 'CENTRALUS:20160718T210236Z:2956b1f9-2664-488f-99a9-0a5ed9b62435',
  date: 'Mon, 18 Jul 2016 21:02:35 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/%2Fsubscriptions%2F4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c%2FresourceGroups%2Finsights-integration%2Fproviders%2Ftest.shoebox%2Ftestresources2%2F0000000000eastusR2/providers/microsoft.insights/diagnosticSettings/service?api-version=2015-07-01', '*')
  .reply(200, "{\"id\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourcegroups/insights-integration/providers/test.shoebox/testresources2/0000000000eastusr2/diagnosticSettings/service\",\"type\":null,\"name\":\"service\",\"location\":null,\"tags\":null,\"properties\":{\"storageAccountId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/insights-integration/providers/microsoft.classicstorage/storageAccounts/sbeastus1a1\",\"serviceBusRuleId\":\"/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/Default-ServiceBus-EastUS/providers/Microsoft.ServiceBus/namespaces/tseastus/authorizationrules/RootManageSharedAccessKey\",\"metrics\":[{\"timeGrain\":\"PT1M\",\"enabled\":false,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}],\"logs\":[{\"category\":\"TestLog1\",\"enabled\":false,\"retentionPolicy\":{\"enabled\":false,\"days\":0}},{\"category\":\"TestLog2\",\"enabled\":true,\"retentionPolicy\":{\"enabled\":false,\"days\":0}}]}}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '906',
  'content-type': 'application/json; charset=utf-8',
  expires: '-1',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'da811979-a1b4-477d-bb2b-bc40de64d2cb',
  server: 'Microsoft-IIS/8.5',
  'x-ms-ratelimit-remaining-subscription-writes': '1197',
  'x-ms-correlation-request-id': '2956b1f9-2664-488f-99a9-0a5ed9b62435',
  'x-ms-routing-request-id': 'CENTRALUS:20160718T210236Z:2956b1f9-2664-488f-99a9-0a5ed9b62435',
  date: 'Mon, 18 Jul 2016 21:02:35 GMT',
  connection: 'close' });
 return result; }]];