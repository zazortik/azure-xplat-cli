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

var constants = require('../constants.js');
var Subscription = require('./subscription.js');
var utils = require('../utils');

function Account(env, adalAuth, resourceClient, log) {
  this._env = env;
  this._adalAuth = adalAuth;
  this._resourceClient = resourceClient;
  this._log = log;
  this.MFAEnabledErrFieldName = 'mfaEnabled';
}

Account.prototype.load = function (username, password, tenant, loginType, callback) {
  var self = this;
  if (!tenant) {
    tenant = constants.AAD_COMMON_TENANT;
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
          type: userType
        },
        tenantId: s.tenantId ? s.tenantId : tenant
      }, self._env);
    });
    
    callback(null, { subscriptions: subs, tenantIds: result.tenantIds });
  }

  if (loginType.servicePrincipal) {
    this._adalAuth.createServicePrincipalTokenCredentials(self._env.getAuthConfig(tenant), username, password, function (err, credential) {
      if (err) { return callback(err); }
      var tenantInfo = {
        tenantId: tenant,
        credential: credential
      };
      self._getSubscriptionsFromTenants(username, [tenantInfo], function (err, subscriptions) {
        if (err) return callback(err);
        return processAndReturnSubscriptions(null, { subscriptions: subscriptions });
      });
    });
  } else if (loginType.mfa) {
    self._getMFASubscriptions(username, tenant, processAndReturnSubscriptions);
  } else {
    self._getNonMFASubscriptions(username, password, tenant, processAndReturnSubscriptions);
  }
};

Account.prototype._getMFASubscriptions = function (username, tenant, callback) {
  var self = this;
  var authConfig = self._env.getAuthConfig(tenant);
  var allTenantsInfo = [];
  async.waterfall([
    function (callback) {
      self._adalAuth.acquireUserCode(authConfig, function (err, userCodeResponse) {
        if (err) return callback(err);
        return callback(null, userCodeResponse);
      });
    },
    function (userCodeResponse, callback) {
      self._log.info(userCodeResponse.message);
      self._log.verbose('code response from AAD is :' + JSON.stringify(userCodeResponse));
      self._adalAuth.authenticateWithDeviceCode(authConfig, userCodeResponse, username, function (err, credential) {
        if (err) return callback(err);
        var userId = _crossCheckUserNameWithToken(username, credential.userId);
        return callback(null, credential, userId);
      });
    },
    function (credential, userId, callback) {
      //tenant list is not used for retrieving subscription; rather just to display to users.
      self._getAllTenants(credential, function (err, result) {
        if (err) return callback(err);
        allTenantsInfo = result.tenantIds;
        return callback(null, credential, userId);
      });
    },
    function (credential, userId, callback) {
      var defaultTenantInfo = [{ tenantId: credential.authConfig.tenantId, credential: credential }];
      self._getSubscriptionsFromTenants(userId, defaultTenantInfo, callback);
    }
  ], function (err, subscriptions) {
    callback(err, { subscriptions: subscriptions, tenantIds: __.pluck(allTenantsInfo, 'tenantId') });
  });
};

Account.prototype._getNonMFASubscriptions = function (username, password, tenant, callback) {
  var self = this;
  self._adalAuth.authenticateWithUsernamePassword(self._env.getAuthConfig(tenant), username, password, function (err, credential) {
    if (err && err.message) {
      if (self._containsMFAErrorCode(err.message)) {
        self._log.info(util.format('Looks like you have Multi-factor authentication enabled. Try again...'));
        err[self.MFAEnabledErrFieldName] = true;
      } else {
        err.message = self._polishError(err.message);
      }

    }
    if (err) return callback(err);
    username = _crossCheckUserNameWithToken(username, credential.userId);
    
    async.waterfall([
      function (callback) {
        self._buildTenantList(username, password, tenant, credential, callback);
      },
      function (tenantList, callback) {
        self._getSubscriptionsFromTenants(username, tenantList, callback);
      },
    ], function (err, subscriptions) {
      callback(err, { subscriptions : subscriptions });
    });
  });
};

Account.prototype._containsMFAErrorCode = function (errMessage) {
  var codes = ['50072', '50074', '50076', '50077', '50078', '50079'];

  return __.any(codes, function (code) {
    return (errMessage.indexOf('AADSTS' + code) !== -1);
  });
};

Account.prototype._polishError = function (errMessage) {
  if (utils.ignoreCaseEquals(errMessage, 'Server returned an unknown AccountType: undefined') ||
      utils.ignoreCaseEquals(errMessage, 'Server returned error in RSTR - ErrorCode: NONE : FaultMessage: NONE')) {
    errMessage = 'Looks like you have used an account type which is not supported. ' + 
        'Please note that currently you can login only via Microsoft organizational account or service principal. ' +
        'For instructions on how to set them up, please read http://aka.ms/Dhf67j.';
  } 
  return errMessage;
};

Account.prototype._getSubscriptionsFromTenants = function (username, tenantList, callback) {
  var self = this;
  var subscriptions = [];
  async.eachSeries(tenantList, function (tenant, cb) {
    var tenantId = tenant.tenantId;
    var armClient = self._getArmClient(tenant.credential);
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

Account.prototype._buildTenantList = function (username, password, tenant, credential, callback) {
  var self = this;
  var tenants = [];
  if (tenant && tenant !== constants.AAD_COMMON_TENANT) {
    tenants = [{
        tenantId: tenant,//'tenant' could be a logical name, interchangable with a tenant guid though
        credential: credential
      }];
    return callback(null, tenants);
  }
  self._getAllTenants(credential, function (err, result) {
    if (err) return callback(err);
    async.eachSeries(result.tenantIds/*'tenantInfos' could be a better name*/, function (tenantInfo, cb) {
      self._adalAuth.authenticateWithUsernamePassword(self._env.getAuthConfig(tenantInfo.tenantId), username, password, function (err, credential) {
        if (err && err.message) {
          if (err.message.match(new RegExp('.*\"error_codes\":\\[50034|50000\\].*'))) {
            self._log.warn(util.format('Due to current limitation, we will skip retrieving subscriptions from the external tenant \'%s\'', tenantInfo.tenantId));
            err = null;
          } else if (self._containsMFAErrorCode(err.message)) {
            var warnText = 'Tenant %s is skipped because it is Multi-factor ' + 
                 'authentication enabled. Please try again using --tenant parameter.';
            self._log.warn(util.format(warnText, tenantInfo.tenantId));
            err = null;
          }
        } else if (!err) {
          tenants.push({
            tenantId: tenantInfo.tenantId,
            credential: credential
          });
        }
        cb(err);
      });
    }, function (err) {
      callback(err, tenants);
    });
  });
};

Account.prototype._getAllTenants = function (credential, callback) {
  var armClient = this._getArmClient(credential);
  armClient.tenants.list(callback);
};

Account.prototype._getArmClient = function (credentials) {
  return this._resourceClient.createResourceSubscriptionClient(credentials, this._env.resourceManagerEndpointUrl);
};

module.exports = Account;

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

