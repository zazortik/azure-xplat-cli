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

var _ = require('underscore');
var adal = require('adal-node');
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var util = require('util');

var FileCache = require('./fileCache');
var utils = require('../utils');
var $ = utils.getLocaleString;

exports.defaultTokenCacheFile = path.join(utils.azureDir(), 'accessTokens.json');

exports.tokenCache = new FileCache(exports.defaultTokenCacheFile);

//
// A list of known azure test endpoints for active directory.
// Turn off authority verification if authority is one of these.
//
var knownTestEndpoints = [
  'https://login.windows-ppe.net',
  'https://sts.login.windows-int.net'
];

function isKnownTestEndpoint(authorityUrl) {
  return _.some(knownTestEndpoints, function (endpoint) {
    return utils.ignoreCaseEquals(endpoint, authorityUrl);
  });
}

/**
* Given a user name derive the tenant id
*
* @param {string} username name of user
*
* @returns {string} tenant Id
*/
exports.tenantIdForUser = function tenantIdForUser(username) {
  var match = username.match(/@(.*)+$/);
  if (match === null) {
    throw new Error(util.format($('No tenant found in username %s'), username));
  }

  var tenant = match[1];
  if (tenant.indexOf('.') === -1) {
    tenant = tenant + '.onmicrosoft.com';
  }
  return tenant;
};

/**
* Add the '.onmicrosoft.com' suffix to the user name
* if it's required and not present.
*
* @param {string} username The original user name
*
* @returns {string} the updated if necessary username
*/
exports.normalizeUserName = function normalizeUserName(username) {
  var match = username.match(/^([^@]+@)([^.]+)$/);
  if (match !== null) {
    username = match[1] + match[2] + '.onmicrosoft.com';
  }
  return username;
};

function refreshToken(authConfig, token, callback) {
  var authorityUrl = authConfig.authorityUrl + '/' + authConfig.tenantId;
  var validateAuthority = !isKnownTestEndpoint(authConfig.authorityUrl);

  var context = new adal.AuthenticationContext(authorityUrl, validateAuthority, exports.tokenCache);

  context.acquireTokenWithRefreshToken(token, authConfig.clientId, null, function (err, response) {
    if (err) { return callback(err); }

    callback(null, response.accessToken, response.refreshToken, response.expiresOn);
  });
}

function createAuthenticationContext(authConfig) {
  var authorityUrl = authConfig.authorityUrl + '/' + authConfig.tenantId;
  var validateAuthority = !isKnownTestEndpoint(authConfig.authorityUrl);

  return new adal.AuthenticationContext(authorityUrl, validateAuthority, exports.tokenCache);
}

function AdalAccessToken(authConfig, userId) {
  this.authConfig = authConfig;
  this.userId = userId;
}

_.extend(AdalAccessToken.prototype, {
  authenticateRequest: function (authorizer) {
    var context = createAuthenticationContext(this.authConfig);
    context.acquireToken(this.authConfig.resourceId, this.userId, this.authConfig.clientId, function (err, result) {
      if (err) {
        authorizer(new Error($('Credentials have expired, please reauthenticate')));
      } else {
        authorizer(null, 'Bearer', result.accessToken);
      }
    });
  },
});

exports.AdalAccessToken = AdalAccessToken;

/**
* Call to Active Directory tenant to get a token back.
* Returns accessToken object via callback.
*
* @param {AuthenticationConfig} authConfig Connection details for AD
*
* @param {string} authConfig.authorityUrl Url for AD tenant to authenticate against
* @param {string} authConfig.tenantId     Active directory tenant ID
* @param {string} authConfig.clientId     Client ID that is requesting authentication
* @param {string} authConfig.resourceId   Id of resoure being accessed
*
* @param {string} username                user identifier
* @param {string} password                the password
* @param {function} callback              callback function (err, accessToken)
*
*/
exports.acquireToken = function (authConfig, username, password, callback) {
  var context = createAuthenticationContext(authConfig);

  context.acquireTokenWithUsernamePassword(authConfig.resourceId, username, password, authConfig.clientId, function (err, response) {
    if (err) { return callback(err); }

    callback(null, new AdalAccessToken(authConfig, response.userId));
  });
};
