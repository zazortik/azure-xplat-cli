// This file has been autogenerated.

var profile = require('../../../lib/util/profile');

exports.getMockedProfile = function () {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: '46241355-bb95-46a9-ba6c-42b554d71925',
    managementCertificate: {
      key: 'mockedKey',
      cert: 'mockedCert'
    },
    name: 'Microsoft Azure Internal Consumption',
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
  process.env['AZURE_ARM_TEST_LOCATION'] = 'westus';
};

exports.scopes = [[function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .delete('/subscriptions/46241355-bb95-46a9-ba6c-42b554d71925/resourceGroups/armclibatchgroup7389/providers/Microsoft.Batch/batchAccounts/armclibatch9879/applications/armclibatchapp9288/versions/1.0?api-version=2015-12-01')
  .reply(204, "", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '0',
  expires: '-1',
  'request-id': 'ae1a3f98-4423-44fe-aeb7-27f975d52fe2',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  server: 'Microsoft-HTTPAPI/2.0',
  'x-ms-ratelimit-remaining-subscription-writes': '1197',
  'x-ms-request-id': 'f25fb113-3820-4552-a8f7-1f8fa6ac7af4',
  'x-ms-correlation-request-id': 'f25fb113-3820-4552-a8f7-1f8fa6ac7af4',
  'x-ms-routing-request-id': 'CENTRALUS:20160913T170823Z:f25fb113-3820-4552-a8f7-1f8fa6ac7af4',
  date: 'Tue, 13 Sep 2016 17:08:23 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .delete('/subscriptions/46241355-bb95-46a9-ba6c-42b554d71925/resourceGroups/armclibatchgroup7389/providers/Microsoft.Batch/batchAccounts/armclibatch9879/applications/armclibatchapp9288/versions/1.0?api-version=2015-12-01')
  .reply(204, "", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '0',
  expires: '-1',
  'request-id': 'ae1a3f98-4423-44fe-aeb7-27f975d52fe2',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  server: 'Microsoft-HTTPAPI/2.0',
  'x-ms-ratelimit-remaining-subscription-writes': '1197',
  'x-ms-request-id': 'f25fb113-3820-4552-a8f7-1f8fa6ac7af4',
  'x-ms-correlation-request-id': 'f25fb113-3820-4552-a8f7-1f8fa6ac7af4',
  'x-ms-routing-request-id': 'CENTRALUS:20160913T170823Z:f25fb113-3820-4552-a8f7-1f8fa6ac7af4',
  date: 'Tue, 13 Sep 2016 17:08:23 GMT',
  connection: 'close' });
 return result; }]];