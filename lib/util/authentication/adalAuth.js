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
var util = require('util');
var utils = require('../utils');
var $ = utils.getLocaleString;

var adal = require('adal-node');
var log = require('../logging');

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

exports.normalizeUserName = function normalizeUserName(username) {
  var match = username.match(/^([^@]+@)([^.]+)$/);
  if (match !== null) {
    username = match[1] + match[2] + '.onmicrosoft.com';
  }
  return username;
}

function AdalAccessToken(authConfig, accessToken, refreshToken, expiresAt) {
  this.authConfig = authConfig;
  this.accessToken = accessToken;
  this.refreshToken = refreshToken;
  this.expiresAt = expiresAt;
}

_.extend(AdalAccessToken.prototype, {
  isExpired: function () {
    return (this.expiresAt.valueOf() - Date.now()) <= 0;
  },

  authenticateRequest: function (authorizer) {
    if (this.isExpired()) {
      authorizer(new Error($('Token is expired, please reauthenticate')));
    }
    authorizer(null, 'Bearer', this.accessToken);
  }
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
  var authorityUrl = authConfig.authorityUrl + '/' + authConfig.tenantId;
  var validateAuthority = !isKnownTestEndpoint(authConfig.authorityUrl);

  var context = new adal.AuthenticationContext(authorityUrl, validateAuthority);

  context.acquireTokenWithUsernamePassword(authConfig.resourceId, username, password, authConfig.clientId, function (err, response) {
    if (err) { return callback(err); }

    /* jshint camelcase: false */
    callback(null, new AdalAccessToken(authConfig, response.access_token, response.refresh_token, response.expires_on));
  });
};
