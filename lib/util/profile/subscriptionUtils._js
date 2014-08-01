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

var azure = require('azure');
var ResourceClient = require('azure-mgmt-resource');

var AccessTokenCloudCredentials = require('../authentication/accessTokenCloudCredentials');

exports.getSubscriptions = function (environment, username, password, _) {
  var accessToken = environment.acquireTokenForUser(username, password, '', _);
  var credentials = new AccessTokenCloudCredentials(accessToken, 'notUsed');
  var asmClient = azure.createSubscriptionClient(credentials, environment.managementEndpointUrl);
  var listResult = asmClient.subscriptions.list(_);
  var asmSubscriptions = listResult.subscriptions;
  var allSubscriptions = [];

  var armClient = ResourceClient.createResourceSubscriptionClient(credentials, environment.resourceManagerEndpointUrl);
  var tenants = armClient.tenants.list(_);
  for (var i = 0; i < tenants.tenantIds.length; i++) {
    var tenantId = tenants.tenantIds[0].tenantId;
    var tenantAccessToken = environment.acquireTokenForUser(username, password, tenantId, _);
    var currentCredentials = new AccessTokenCloudCredentials(tenantAccessToken, 'notUsed');
    var currentArmClient = ResourceClient.createResourceSubscriptionClient(currentCredentials, environment.resourceManagerEndpointUrl);
    listResult = currentArmClient.subscriptions.list(_);
    allSubscriptions = mergeSubscriptions(asmSubscriptions, listResult.subscriptions, tenantId);
  }
  return allSubscriptions;
};

function mergeSubscriptions(asmSubscriptions, armSubscriptions, tenantId) {
  var allSubscriptions = asmSubscriptions;
  for (var i = 0; i < armSubscriptions.length; i++) {
    for (var j = 0; j < allSubscriptions.length; j++) {
      if (allSubscriptions[i].subscriptionId === armSubscriptions[j].subscriptionId) {
        break;
      }
    }
    if (j === allSubscriptions.length) {
      //add a special tag since this subscription won't work under ASM mode
      armSubscriptions[i].isArmBased = true;
      //populate 2 properties needed for commands
      armSubscriptions[i].subscriptionName = armSubscriptions[i].displayName;
      armSubscriptions[i].activeDirectoryTenantId = tenantId;

      allSubscriptions.push(armSubscriptions[i]);
    }
  }
  return allSubscriptions;
}