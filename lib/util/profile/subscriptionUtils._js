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
var util = require('util');

var AccessTokenCloudCredentials = require('../authentication/accessTokenCloudCredentials');
var utils = require('../utils');

exports.getSubscriptions = function (environment, username, password, _) {
  var accessToken = environment.acquireToken(username, password, '', _);

  username = crossCheckUserNameWithToken(username, accessToken.userId);

  var asmClient = environment.getAsmClient(new AccessTokenCloudCredentials(accessToken, 'notUsed'));
  var asms = asmClient.subscriptions.list(_).subscriptions;
  var all = asms;

  var armClient = environment.getArmClient(new AccessTokenCloudCredentials(accessToken, 'notUsed'));
  var tenants = armClient.tenants.list(_);
  var tenantAccessToken;
  for (var i = 0; i < tenants.tenantIds.length; i++) {
    var tenantId = tenants.tenantIds[i].tenantId;
    tenantAccessToken = undefined;
    try{
      tenantAccessToken = environment.acquireToken(username, password, tenantId, _);
    } catch (e) {
      if (e.message && e.message.match(new RegExp('.*\"error_codes\":\\[50034\\].*'))) {
        console.log(util.format('skipping external tenant \'%s\', you are a guest of', tenantId));
      } else {
        throw e;
      }
    }
    if (tenantAccessToken) {
      armClient = environment.getArmClient(new AccessTokenCloudCredentials(tenantAccessToken, 'notUsed'));
      var arms = armClient.subscriptions.list(_).subscriptions;
      all = mergeSubscriptions(all, arms, tenantId);
    }
  }
  all.forEach(function (sub) {
    sub.username = username;
  });
  return all;
};

function crossCheckUserNameWithToken(usernameFromCommandline, userIdFromToken) {
  //to maintain the casing consistency between 'azureprofile.json' and token cache. (RD 1996587) 
  //use the 'userId' here, which should be the same with "username" except the casing.
  if (utils.ignoreCaseEquals(usernameFromCommandline, userIdFromToken)) {
    return userIdFromToken;
  } else {
    throw new Error(util.format('invalid user name %s', usernameFromCommandline));
  }
}

function mergeSubscriptions(all, arms, tenantId) {
  var existingNum = all.length;
  for (var i = 0; i < arms.length; i++) {
    for (var j = 0; j < existingNum; j++) {
      if (all[j].subscriptionId === arms[i].subscriptionId) {
        break;
      }
    }
    if (j === existingNum) {
      //add a special tag since this subscription won't work under ASM mode
      arms[i].isArmBased = true;
      //populate 2 properties needed for commands
      arms[i].subscriptionName = arms[i].displayName;
      arms[i].activeDirectoryTenantId = tenantId;

      all.push(arms[i]);
    }
  }
  return all;
}