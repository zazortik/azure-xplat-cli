// This file has been autogenerated.

var profile = require('../../../lib/util/profile');

exports.getMockedProfile = function () {
  var newProfile = new profile.Profile();

  newProfile.addSubscription(new profile.Subscription({
    id: 'bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948',
    name: 'CollaberaInteropTest',
    user: {
      name: 'user@domain.example',
      type: 'user'
    },
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
    registeredProviders: [],
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
  .get('/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool?api-version=2015-05-01-preview')
  .reply(200, "{\r\n  \"name\": \"xplattestLbLbNatPool\",\r\n  \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool\",\r\n  \"etag\": \"W/\\\"75045d0a-021e-4c16-b557-0d4bd26a3726\\\"\",\r\n  \"type\": \"Microsoft.Network/loadBalancers\",\r\n  \"location\": \"southeastasia\",\r\n  \"tags\": {},\r\n  \"properties\": {\r\n    \"provisioningState\": \"Succeeded\",\r\n    \"resourceGuid\": \"e54ab92c-f428-4fa8-87c3-8fe971cab109\",\r\n    \"frontendIPConfigurations\": [\r\n      {\r\n        \"name\": \"xplattestFrontendIpNatPool\",\r\n        \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/frontendIPConfigurations/xplattestFrontendIpNatPool\",\r\n        \"etag\": \"W/\\\"75045d0a-021e-4c16-b557-0d4bd26a3726\\\"\",\r\n        \"properties\": {\r\n          \"provisioningState\": \"Succeeded\",\r\n          \"privateIPAllocationMethod\": \"Dynamic\",\r\n          \"publicIPAddress\": {\r\n            \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/publicIPAddresses/xplatTestIpLbNatPool\"\r\n          },\r\n          \"inboundNatPools\": [\r\n            {\r\n              \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/inboundNatPools/xplattestInboundNatPool\"\r\n            }\r\n          ]\r\n        }\r\n      }\r\n    ],\r\n    \"backendAddressPools\": [],\r\n    \"loadBalancingRules\": [],\r\n    \"probes\": [],\r\n    \"inboundNatRules\": [],\r\n    \"outboundNatRules\": [],\r\n    \"inboundNatPools\": [\r\n      {\r\n        \"name\": \"xplattestInboundNatPool\",\r\n        \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/inboundNatPools/xplattestInboundNatPool\",\r\n        \"etag\": \"W/\\\"75045d0a-021e-4c16-b557-0d4bd26a3726\\\"\",\r\n        \"properties\": {\r\n          \"provisioningState\": \"Succeeded\",\r\n          \"frontendPortRangeStart\": 11,\r\n          \"frontendPortRangeEnd\": 21,\r\n          \"backendPort\": 3380,\r\n          \"protocol\": \"Tcp\",\r\n          \"frontendIPConfiguration\": {\r\n            \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/frontendIPConfigurations/xplattestFrontendIpNatPool\"\r\n          }\r\n        }\r\n      }\r\n    ]\r\n  }\r\n}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '2547',
  'content-type': 'application/json; charset=utf-8',
  expires: '-1',
  etag: 'W/"75045d0a-021e-4c16-b557-0d4bd26a3726"',
  'x-ms-request-id': 'a17a4729-8d09-44e8-bf1d-8855c45abd8d',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  server: 'Microsoft-HTTPAPI/2.0, Microsoft-HTTPAPI/2.0',
  'x-ms-ratelimit-remaining-subscription-reads': '14992',
  'x-ms-correlation-request-id': '5ac64f8d-14f9-490b-b85c-d7e33bee36b5',
  'x-ms-routing-request-id': 'SOUTHEASTASIA:20150928T071139Z:5ac64f8d-14f9-490b-b85c-d7e33bee36b5',
  date: 'Mon, 28 Sep 2015 07:11:39 GMT',
  connection: 'close' });
 return result; },
function (nock) { 
var result = 
nock('https://management.azure.com:443')
  .get('/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool?api-version=2015-05-01-preview')
  .reply(200, "{\r\n  \"name\": \"xplattestLbLbNatPool\",\r\n  \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool\",\r\n  \"etag\": \"W/\\\"75045d0a-021e-4c16-b557-0d4bd26a3726\\\"\",\r\n  \"type\": \"Microsoft.Network/loadBalancers\",\r\n  \"location\": \"southeastasia\",\r\n  \"tags\": {},\r\n  \"properties\": {\r\n    \"provisioningState\": \"Succeeded\",\r\n    \"resourceGuid\": \"e54ab92c-f428-4fa8-87c3-8fe971cab109\",\r\n    \"frontendIPConfigurations\": [\r\n      {\r\n        \"name\": \"xplattestFrontendIpNatPool\",\r\n        \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/frontendIPConfigurations/xplattestFrontendIpNatPool\",\r\n        \"etag\": \"W/\\\"75045d0a-021e-4c16-b557-0d4bd26a3726\\\"\",\r\n        \"properties\": {\r\n          \"provisioningState\": \"Succeeded\",\r\n          \"privateIPAllocationMethod\": \"Dynamic\",\r\n          \"publicIPAddress\": {\r\n            \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/publicIPAddresses/xplatTestIpLbNatPool\"\r\n          },\r\n          \"inboundNatPools\": [\r\n            {\r\n              \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/inboundNatPools/xplattestInboundNatPool\"\r\n            }\r\n          ]\r\n        }\r\n      }\r\n    ],\r\n    \"backendAddressPools\": [],\r\n    \"loadBalancingRules\": [],\r\n    \"probes\": [],\r\n    \"inboundNatRules\": [],\r\n    \"outboundNatRules\": [],\r\n    \"inboundNatPools\": [\r\n      {\r\n        \"name\": \"xplattestInboundNatPool\",\r\n        \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/inboundNatPools/xplattestInboundNatPool\",\r\n        \"etag\": \"W/\\\"75045d0a-021e-4c16-b557-0d4bd26a3726\\\"\",\r\n        \"properties\": {\r\n          \"provisioningState\": \"Succeeded\",\r\n          \"frontendPortRangeStart\": 11,\r\n          \"frontendPortRangeEnd\": 21,\r\n          \"backendPort\": 3380,\r\n          \"protocol\": \"Tcp\",\r\n          \"frontendIPConfiguration\": {\r\n            \"id\": \"/subscriptions/bfb5e0bf-124b-4d0c-9352-7c0a9f4d9948/resourceGroups/xplatTestGCreateLbNatPool/providers/Microsoft.Network/loadBalancers/xplattestLbLbNatPool/frontendIPConfigurations/xplattestFrontendIpNatPool\"\r\n          }\r\n        }\r\n      }\r\n    ]\r\n  }\r\n}", { 'cache-control': 'no-cache',
  pragma: 'no-cache',
  'content-length': '2547',
  'content-type': 'application/json; charset=utf-8',
  expires: '-1',
  etag: 'W/"75045d0a-021e-4c16-b557-0d4bd26a3726"',
  'x-ms-request-id': 'a17a4729-8d09-44e8-bf1d-8855c45abd8d',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  server: 'Microsoft-HTTPAPI/2.0, Microsoft-HTTPAPI/2.0',
  'x-ms-ratelimit-remaining-subscription-reads': '14992',
  'x-ms-correlation-request-id': '5ac64f8d-14f9-490b-b85c-d7e33bee36b5',
  'x-ms-routing-request-id': 'SOUTHEASTASIA:20150928T071139Z:5ac64f8d-14f9-490b-b85c-d7e33bee36b5',
  date: 'Mon, 28 Sep 2015 07:11:39 GMT',
  connection: 'close' });
 return result; }]];