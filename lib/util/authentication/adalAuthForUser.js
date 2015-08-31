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
var _ = require('underscore');

var TokenCredentials = require('./tokenCredentials');
var adalAuth = require('./adalAuth');
var utils = require('../utils');
var $ = utils.getLocaleString;

function UserTokenCredentials(authConfig, userId) {
  this.authConfig = authConfig;
  this.userId = userId;
}

util.inherits(UserTokenCredentials, TokenCredentials);

UserTokenCredentials.prototype.retrieveTokenFromCache = function (callback) {
  var context = adalAuth.createAuthenticationContext(this.authConfig);
  context.acquireToken(this.authConfig.resourceId, this.userId, this.authConfig.clientId, function (err, result) {
    if (err) {
      callback(new Error($('Credentials have expired, please reauthenticate.\n         ' +
                               'Detailed error message from ADAL is as follows: ' + err)));
    } else {
      callback(null, 'Bearer', result.accessToken);
    }
  });
};

function authenticateWithUsernamePassword(authConfig, username, password, callback) {
  var context = adalAuth.createAuthenticationContext(authConfig);
  context.acquireTokenWithUsernamePassword(authConfig.resourceId, username, password, authConfig.clientId, function (err, response) {
    if (err) { return callback(err); }
    callback(null, new exports.UserTokenCredentials(authConfig, response.userId));
  });
}

function acquireUserCode(authConfig, callback) {
  var context = adalAuth.createAuthenticationContext(authConfig);
  return context.acquireUserCode(authConfig.resourceId, authConfig.clientId, 'es-mx', callback);
}

function authenticateWithDeviceCode(authConfig, userCodeResponse, userId, callback) {
  var context = adalAuth.createAuthenticationContext(authConfig);
  adalAuth.tokenCache.setUserIdWhenUseDeviceFlow(userId);
  return context.acquireTokenWithDeviceCode(authConfig.resourceId, authConfig.clientId, userCodeResponse, function (err, tokenResponse) {
    if (err) { return callback(err); }
    //it is by-design that a token request starts with 'common' and get back
    //issued from the default tenant, so we will use the default tenant if for 2fa. The reason
    //is we do not acquire token again from default tenant and this is the only chance to
    //persist the tenant id
    authConfig.tenantId = tokenResponse.tenantId;
    return callback(null, new exports.UserTokenCredentials(authConfig, tokenResponse.userId));
  });
}

_.extend(exports, {
  UserTokenCredentials: UserTokenCredentials,
  authenticateWithUsernamePassword: authenticateWithUsernamePassword,
  acquireUserCode: acquireUserCode,
  authenticateWithDeviceCode: authenticateWithDeviceCode,
  normalizeUserName: adalAuth.normalizeUserName
});
