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

var __ = require('underscore');
var async = require('async');

var adalAuth = require('../authentication/adalAuth');
var subscriptionUtils = require('./subscriptionUtils');

function getSubscriptions(environment, username, tenant, callback) {
  //todo: print out warning that we do not need the password? 
  //todo: print out all the tenant list
  //todo: clean up all the token belonging to the username
  //todo: make sure the token cache has the userid added as a field
  var authConfig = environment.getAuthConfig(tenant);
  async.waterfall([
    function (callback) {
      adalAuth.acquireUserCode(authConfig, function (err, userCodeResponse) {
        if (err) return callback(err);
        return callback(null, userCodeResponse);
      });
    },
    function (userCodeResponse, callback) {
      console.log(userCodeResponse.message);
      //todo, print out all under verbose mode
      adalAuth.acquireTokenWithDeviceCode(authConfig, userCodeResponse, username, function (err, authContext) {
        if (err) {
          return callback(err);
        }
        var userId = subscriptionUtils.crossCheckUserNameWithToken(username, authContext.userId);
        return callback(null, [{ tenantId: authContext.authConfig.tenantId, authContext: authContext}], userId);
      });
    },
    function (tenantList, userId, callback) {
      subscriptionUtils.getSubscriptionsFromTenants(environment, userId, tenantList, callback);
    },
  ], function (err, subscriptions) {
    callback(err, subscriptions);
  });
}

__.extend(exports, {
  getSubscriptions: getSubscriptions
});
