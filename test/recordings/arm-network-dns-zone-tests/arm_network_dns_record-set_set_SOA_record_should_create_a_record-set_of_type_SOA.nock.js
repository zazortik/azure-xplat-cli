// This file has been autogenerated.

var profile = require('../../../lib/util/profile');

exports.getMockedProfile = function () {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: '2c224e7e-3ef5-431d-a57b-e71f4662e3a6',
    name: 'Node CLI Test',
    user: {
      name: 'user@domain.example',
      type: 'user'
    },
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    state: 'Enabled',
    registeredProviders: ['mobileservice', 'website'],
    _eventsCount: '1',
    isDefault: true
  }, newProfile.environments['AzureCloud']));

  return newProfile;
};

exports.setEnvironment = function() {
  process.env['AZURE_VM_TEST_LOCATION'] = 'southeastasia';
};

exports.scopes = [[function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .get('/subscriptions/2c224e7e-3ef5-431d-a57b-e71f4662e3a6/resourceGroups/xplat-test-dns-zone-record-set9316/providers/Microsoft.Network/dnszones/example1.com/SOA/@?api-version=2016-04-01')
  .reply(200, "{\"id\":\"\\/subscriptions\\/2c224e7e-3ef5-431d-a57b-e71f4662e3a6\\/resourceGroups\\/xplat-test-dns-zone-record-set9316\\/providers\\/Microsoft.Network\\/dnszones\\/example1.com\\/SOA\\/@\",\"name\":\"@\",\"type\":\"Microsoft.Network\\/dnszones\\/SOA\",\"etag\":\"9a7b8471-eb92-4dc5-b47f-204eb1847fbf\",\"properties\":{\"fqdn\":\"example1.com.\",\"TTL\":3600,\"SOARecord\":{\"email\":\"azuredns-hostmaster.microsoft.com\",\"expireTime\":2419200,\"host\":\"ns1-01.azure-dns.com.\",\"minimumTTL\":300,\"refreshTime\":3600,\"retryTime\":300,\"serialNumber\":1}}}", { 'cache-control': 'private',
  'content-length': '503',
  'content-type': 'application/json; charset=utf-8',
  etag: '9a7b8471-eb92-4dc5-b47f-204eb1847fbf',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'a0c70f8e-e7db-4cff-ab75-1e12d2b54ebb',
  server: 'Microsoft-IIS/8.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-reads': '14963',
  'x-ms-correlation-request-id': '61cff6a0-8bbd-4e5c-95f1-d28c320c66fb',
  'x-ms-routing-request-id': 'WESTEUROPE:20160829T124401Z:61cff6a0-8bbd-4e5c-95f1-d28c320c66fb',
  date: 'Mon, 29 Aug 2016 12:44:01 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .get('/subscriptions/2c224e7e-3ef5-431d-a57b-e71f4662e3a6/resourceGroups/xplat-test-dns-zone-record-set9316/providers/Microsoft.Network/dnszones/example1.com/SOA/@?api-version=2016-04-01')
  .reply(200, "{\"id\":\"\\/subscriptions\\/2c224e7e-3ef5-431d-a57b-e71f4662e3a6\\/resourceGroups\\/xplat-test-dns-zone-record-set9316\\/providers\\/Microsoft.Network\\/dnszones\\/example1.com\\/SOA\\/@\",\"name\":\"@\",\"type\":\"Microsoft.Network\\/dnszones\\/SOA\",\"etag\":\"9a7b8471-eb92-4dc5-b47f-204eb1847fbf\",\"properties\":{\"fqdn\":\"example1.com.\",\"TTL\":3600,\"SOARecord\":{\"email\":\"azuredns-hostmaster.microsoft.com\",\"expireTime\":2419200,\"host\":\"ns1-01.azure-dns.com.\",\"minimumTTL\":300,\"refreshTime\":3600,\"retryTime\":300,\"serialNumber\":1}}}", { 'cache-control': 'private',
  'content-length': '503',
  'content-type': 'application/json; charset=utf-8',
  etag: '9a7b8471-eb92-4dc5-b47f-204eb1847fbf',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': 'a0c70f8e-e7db-4cff-ab75-1e12d2b54ebb',
  server: 'Microsoft-IIS/8.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-reads': '14963',
  'x-ms-correlation-request-id': '61cff6a0-8bbd-4e5c-95f1-d28c320c66fb',
  'x-ms-routing-request-id': 'WESTEUROPE:20160829T124401Z:61cff6a0-8bbd-4e5c-95f1-d28c320c66fb',
  date: 'Mon, 29 Aug 2016 12:44:01 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('http://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/subscriptions/2c224e7e-3ef5-431d-a57b-e71f4662e3a6/resourceGroups/xplat-test-dns-zone-record-set9316/providers/Microsoft.Network/dnszones/example1.com/SOA/@?api-version=2016-04-01', '*')
  .reply(200, "{\"id\":\"\\/subscriptions\\/2c224e7e-3ef5-431d-a57b-e71f4662e3a6\\/resourceGroups\\/xplat-test-dns-zone-record-set9316\\/providers\\/Microsoft.Network\\/dnszones\\/example1.com\\/SOA\\/@\",\"name\":\"@\",\"type\":\"Microsoft.Network\\/dnszones\\/SOA\",\"etag\":\"1d762513-cc8c-441b-96d1-2122ed06a7c9\",\"properties\":{\"metadata\":{\"tag1\":\"aaa\",\"tag2\":\"bbb\"},\"fqdn\":\"example1.com.\",\"TTL\":3600,\"SOARecord\":{\"email\":\"azuredns-hostmaster.microsoft.com\",\"expireTime\":60000,\"host\":\"ns1-01.azure-dns.com.\",\"minimumTTL\":2400,\"refreshTime\":3600,\"retryTime\":6400,\"serialNumber\":123}}}", { 'cache-control': 'private',
  'content-length': '544',
  'content-type': 'application/json; charset=utf-8',
  etag: '1d762513-cc8c-441b-96d1-2122ed06a7c9',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': '664b0d9a-2e97-41c5-a577-99a4f9750727',
  server: 'Microsoft-IIS/8.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-writes': '1190',
  'x-ms-correlation-request-id': 'd2a45d22-5ee7-4af4-a748-74f5297a55ad',
  'x-ms-routing-request-id': 'WESTEUROPE:20160829T124402Z:d2a45d22-5ee7-4af4-a748-74f5297a55ad',
  date: 'Mon, 29 Aug 2016 12:44:02 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .filteringRequestBody(function (path) { return '*';})
.put('/subscriptions/2c224e7e-3ef5-431d-a57b-e71f4662e3a6/resourceGroups/xplat-test-dns-zone-record-set9316/providers/Microsoft.Network/dnszones/example1.com/SOA/@?api-version=2016-04-01', '*')
  .reply(200, "{\"id\":\"\\/subscriptions\\/2c224e7e-3ef5-431d-a57b-e71f4662e3a6\\/resourceGroups\\/xplat-test-dns-zone-record-set9316\\/providers\\/Microsoft.Network\\/dnszones\\/example1.com\\/SOA\\/@\",\"name\":\"@\",\"type\":\"Microsoft.Network\\/dnszones\\/SOA\",\"etag\":\"1d762513-cc8c-441b-96d1-2122ed06a7c9\",\"properties\":{\"metadata\":{\"tag1\":\"aaa\",\"tag2\":\"bbb\"},\"fqdn\":\"example1.com.\",\"TTL\":3600,\"SOARecord\":{\"email\":\"azuredns-hostmaster.microsoft.com\",\"expireTime\":60000,\"host\":\"ns1-01.azure-dns.com.\",\"minimumTTL\":2400,\"refreshTime\":3600,\"retryTime\":6400,\"serialNumber\":123}}}", { 'cache-control': 'private',
  'content-length': '544',
  'content-type': 'application/json; charset=utf-8',
  etag: '1d762513-cc8c-441b-96d1-2122ed06a7c9',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-ms-request-id': '664b0d9a-2e97-41c5-a577-99a4f9750727',
  server: 'Microsoft-IIS/8.5',
  'x-aspnet-version': '4.0.30319',
  'x-powered-by': 'ASP.NET',
  'x-ms-ratelimit-remaining-subscription-writes': '1190',
  'x-ms-correlation-request-id': 'd2a45d22-5ee7-4af4-a748-74f5297a55ad',
  'x-ms-routing-request-id': 'WESTEUROPE:20160829T124402Z:d2a45d22-5ee7-4af4-a748-74f5297a55ad',
  date: 'Mon, 29 Aug 2016 12:44:02 GMT',
  connection: 'close' });
 return result; }]];
