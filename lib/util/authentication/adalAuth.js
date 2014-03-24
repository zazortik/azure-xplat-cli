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
var util = require('util');

var log = require('../logging');
var utils = require('../utils');
var $ = utils.getLocaleString;

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

  var context = new adal.AuthenticationContext(authorityUrl, validateAuthority);

  context.acquireTokenWithRefreshToken(token, authConfig.clientId, null, function (err, response) {
    if (err) { return callback(err); }

    callback(null, response.accessToken, response.refreshToken, response.expiresOn);
  });
}

function AdalAccessToken(authConfig, accessToken, refreshToken, expiresAt) {
  this.authConfig = authConfig;
  this.accessToken = accessToken;
  this.refreshToken = refreshToken;
  if (typeof expiresAt === 'string') {
    expiresAt = new Date(expiresAt);
  }
  this.expiresAt = expiresAt;
}

util.inherits(AdalAccessToken, EventEmitter);

_.extend(AdalAccessToken.prototype, {
  isExpired: function () {
    return (this.expiresAt.getTime() - Date.now()) <= 0;
  },

  needsRefresh: function () {
    var tenMinutesInMS = 10 * 60 * 1000;
    return (this.expiresAt.getTime() - Date.now()) <= tenMinutesInMS;
  },

  authenticateRequest: function (authorizer) {
    var self = this;
    self.getValidToken(function (err, accessToken) {
      if (err) {
        authorizer(new Error($('Credentials have expired, please reauthenticate')));
      } else {
        authorizer(null, 'Bearer', accessToken);
      }
    });
  },

  getValidToken: function (callback) {
    var self = this;
    if (self.needsRefresh()) {
      refreshToken(self.authConfig, self.refreshToken, function (err, newAccessToken, newRefreshToken, newExpiration) {
        if (err) {
          callback(new Error($('Credentials have expired, please reauthenticate')));
        } else {
          self.accessToken = newAccessToken;
          self.refreshToken = newRefreshToken;
          self.expiresAt = newExpiration;
          self.emit('updated');
          callback(null, self.accessToken);
        }
      });
    } else {
      process.nextTick(function () { callback(null, self.accessToken); });
    }
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

    callback(null, new AdalAccessToken(authConfig, response.accessToken, response.refreshToken, response.expiresOn));
  });
};

var adalLevel = adal.Logging.LOGGING_LEVEL;

var adalToWinstonLevels = {};
adalToWinstonLevels[adalLevel['ERROR']] = 'error';
adalToWinstonLevels[adalLevel['WARN']] = 'warn';
adalToWinstonLevels[adalLevel['INFO']] = 'silly';
adalToWinstonLevels[adalLevel['VERBOSE']] = 'silly';

adal.Logging.setLoggingOptions({
  level: adalLevel.VERBOSE,
  log : function (level, message, error) {
    var output = util.format(error ? '%s: %s' : '%s', message, error);
    log.log(adalToWinstonLevels[level], output);
  }
});
