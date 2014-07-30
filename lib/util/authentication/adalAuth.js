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
var os = require('os');
var path = require('path');
var util = require('util');

var TokenCache;

if (os.platform() === 'darwin') {
  TokenCache = require('./osx-token-cache');
} else if (os.platform() === 'win32') {
  TokenCache = require('./win-credstore-token-cache');
} else {
  TokenCache = require('./fileCache');
}

var logging = require('../logging');
var utils = require('../utils');
var $ = utils.getLocaleString;

exports.defaultTokenCacheFile = path.join(utils.azureDir(), 'accessTokens.json');

exports.tokenCache = new TokenCache(exports.defaultTokenCacheFile);

function turnOnLogging() {
  var log = adal.Logging;
  log.setLoggingOptions(
  {
    level : log.LOGGING_LEVEL.VERBOSE,
    log : function(level, message, error) {
      logging.info(message);
      if (error) {
        logging.error(error);
      }
    }
  });
}

if (process.env['AZURE_ADAL_LOGGING_ENABLED']) {
  turnOnLogging();
}

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

/**
* This is the callback passed to the logoutUser method
* @callback LogoutUserCallback
* @param {Error} [err] Any errors that occur are passed here.
*/

/**
* Logs out a user, deleting any cached users for that username.
*
* @param {string}             username  username to remove tokens for.
* @param {TokenCache}         [cache]   cache to delete from, optional, uses
*                                       default cache if not given
* @param {LogoutUserCallback} done      completion callback
*/
exports.logoutUser = function (username, cache, done) {
  if (typeof cache === 'function') {
    done = cache;
    cache = exports.tokenCache;
  }
  cache.find({userId: username}, function (err, found) {
    if (err) { return done(err); }
    cache.remove(found, done);
  });
};
