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

var util = require('util');
var async = require('async');
var __ = require('underscore');

var AccessTokenCloudCredentials = require('../authentication/accessTokenCloudCredentials');
var constants = require('../constants');
var Subscription = require('./subscription.js');
var utils = require('../utils');

function Account(activeDirectoryResourceId, 
                 activeDirectoryEndpointUrl, 
                 resourceManagerEndpointUrl,
                 adalAuth,
                 resourceClient) {
  this._activeDirectoryResourceId = activeDirectoryResourceId;
  this._activeDirectoryEndpointUrl = activeDirectoryEndpointUrl;
  this._resourceManagerEndpointUrl = resourceManagerEndpointUrl;
  this._adalAuth = adalAuth;
  this._resourceClient = resourceClient;
}

Account.prototype.load = function (username, password, tenant, loginType, callback) {
  var self = this;
  if (!tenant) {
    tenant = 'common';
  }
  username = self._adalAuth.normalizeUserName(username);
  var userType = 'user';
  
  if (loginType.servicePrincipal) {
    userType = 'servicePrincipal';
  }
  
  function processAndReturnSubscriptions(err, result) {
    if (err) return callback(err); 
    var subscriptions = result.subscriptions;
    var subs = __.map(subscriptions, function (s) {
      return new Subscription({
        id: s.subscriptionId,
        name: s.displayName || s.subscriptionName,
        user: {
          name: username,
          tenant: tenant,
          type: userType
        },
        tenantId: s.tenantId ? s.tenantId : tenant
      }, self);
    });
    
    callback(null, { subscriptions: subs, tenantIds: result.tenantIds });
  }

  if (loginType.servicePrincipal) {
    this._adalAuth.acquireServicePrincipalToken(self._getAuthConfig(tenant), username, password, function (err, token) {
      if (err) { return callback(err); }
      var tenantInfo = {
        tenantId: tenant,
        authContext: token
      };
      self._getSubscriptionsFromTenants(self, username, [tenantInfo], processAndReturnSubscriptions);
    });
  } else if (loginType.mfa) {
    self._getMtaSubscriptions(username, tenant, processAndReturnSubscriptions);
  } else {
    self._getNonMtaSubscriptions(username, password, tenant, processAndReturnSubscriptions);
  }
};

Account.prototype._getMtaSubscriptions = function (username, tenant, callback) {
  //todo: print out warning that we do not need the password? 
  //todo: clean up all the token belonging to the username
  var self = this;
  var authConfig = self._getAuthConfig(tenant);
  var allTenantsInfo = [];
  async.waterfall([
    function (callback) {
      self._adalAuth.acquireUserCode(authConfig, function (err, userCodeResponse) {
        if (err) return callback(err);
        return callback(null, userCodeResponse);
      });
    },
    function (userCodeResponse, callback) {
      console.log(userCodeResponse.message);
      //todo, print out all under verbose mode
      self._adalAuth.acquireTokenWithDeviceCode(authConfig, userCodeResponse, username, function (err, authContext) {
        if (err) return callback(err);
        var userId = _crossCheckUserNameWithToken(username, authContext.userId);
        return callback(null, authContext, userId);
      });
    },
    function (authContext, userId, callback) {
      self._getAllTenants(authContext, function (err, result) {
        if (err) return callback(err);
        allTenantsInfo = result.tenantIds;
        return callback(null, authContext, userId);
      });
    },
    function (authContext, userId, callback) {
      var defaultTenantInfo = [{ tenantId: authContext.authConfig.tenantId, authContext: authContext }];
      self._getSubscriptionsFromTenants(userId, defaultTenantInfo, callback);
    }
  ], function (err, subscriptions) {
    callback(err, { subscriptions: subscriptions, tenantIds: __.pluck(allTenantsInfo, 'tenantId') });
  });
};

Account.prototype._getNonMtaSubscriptions = function (username, password, tenant, callback) {
  var self = this;
  self._adalAuth.acquireToken(self._getAuthConfig(tenant), username, password, function (err, authContext) {
    if (err && err.message && err.message.match(new RegExp('.*AADSTS50079: Strong authentication enrollment.*'))) {
      console.log(util.format('Looks like you have Multi-factor authentication enabled. Try again...'));
      err['2faEnabled'] = true; //todo use constants.
    }
    if (err) return callback(err);
    username = _crossCheckUserNameWithToken(username, authContext.userId);
    
    async.waterfall([
      function (callback) {
        self._buildTenantList(username, password, tenant, authContext, callback);
      },
      function (tenantList, callback) {
        self._getSubscriptionsFromTenants(username, tenantList, callback);
      },
    ], function (err, subscriptions) {
      callback(err, { subscriptions : subscriptions });
    });
  });
};

Account.prototype._getAuthConfig = function (tenantId) {
  return {
    authorityUrl: this._activeDirectoryEndpointUrl,
    tenantId: tenantId,
    resourceId: this._activeDirectoryResourceId,
    clientId: constants.XPLAT_CLI_CLIENT_ID
  };
};

Account.prototype._getSubscriptionsFromTenants = function (username, tenantList, callback) {
  var self = this;
  var subscriptions = [];
  async.eachSeries(tenantList, function (tenant, cb) {
    var tenantId = tenant.tenantId;
    var armClient = self._getArmClient(_createCredential(tenant.authContext));
    armClient.subscriptions.list(function (err, result) {
      if (!err) {
        subscriptions = subscriptions.concat(result.subscriptions.map(function (s) {
          s.tenantId = tenantId;
          s.username = username;
          return s;
        }));
      }
      cb(err);
    });
  }, function (err) {
    callback(err, subscriptions);
  });
};

Account.prototype._buildTenantList = function (username, password, tenant, authContext, callback) {
  var self = this;
  var tenants = [];
  if (tenant && tenant !== 'common') {
    tenants = [{
        tenantId: tenant,//'tenant' could be a logical name, interchangable with a tenant guid though
        authContext: authContext
      }];
    return callback(null, tenants);
  }
  self._getAllTenants(authContext, function (err, result) {
    if (err) return callback(err);
    async.eachSeries(result.tenantIds/*'tenantInfos' could be a better name*/, function (tenantInfo, cb) {
      self._adalAuth.acquireToken(self._getAuthConfig(tenantInfo.tenantId), username, password, function (err, authContext) {
        if (err && err.message && err.message.match(new RegExp('.*\"error_codes\":\\[50034|50000\\].*'))) {
          console.log(util.format('Due to current limitation, we will skip retrieving subscriptions from the external tenant \'%s\'', tenantInfo.tenantId));
          err = null;
        }
        if (!err) {
          tenants.push({
            tenantId: tenantInfo.tenantId,
            authContext: authContext
          });
        }
        cb(err);
      });
    }, function (err) {
      callback(err, tenants);
    });
  });
};

Account.prototype._getAllTenants = function (authContext, callback) {
  var armClient = this._getArmClient(_createCredential(authContext));
  armClient.tenants.list(callback);
};

Account.prototype._getArmClient = function (credentials) {
  return this._resourceClient.createResourceSubscriptionClient(credentials, this._resourceManagerEndpointUrl);
};

module.exports = Account;

function _createCredential(authContext) {
  return new AccessTokenCloudCredentials(authContext, 'notUsed');
}

function _crossCheckUserNameWithToken(usernameFromCommandline, userIdFromToken) {
  //to maintain the casing consistency between 'azureprofile.json' and token cache. (RD 1996587)
  //use the 'userId' here, which should be the same with "username" except the casing.
  if (utils.ignoreCaseEquals(usernameFromCommandline, userIdFromToken)) {
    return userIdFromToken;
  } else {
    throw new Error(util.format('The userId of \'%s\' in access token doesn\'t match the  command line username of \'%s\'', 
      userIdFromToken, usernameFromCommandline));
  }
}

