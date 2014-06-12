/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
'use strict';

var policy = require('azure-policy');

exports.getClient = function getPolicyClient(subscription) {

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  var PASTenantID = '1EEEB395-21C8-4AE0-B145-2ABD2DFE501D';
  var PASEndpoint = 'https://aad-pas-nova-by1-001.cloudapp.net';

  var client = policy.createPolicyManagementClient(subscription._createCredentials(),
      subscription.managementEndpointUrl);
  client.credentials.subscriptionId = PASTenantID;
  client.baseUri = PASEndpoint;
  return client;
};