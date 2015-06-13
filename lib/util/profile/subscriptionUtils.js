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
var util = require('util');

var AccessTokenCloudCredentials = require('../authentication/accessTokenCloudCredentials');
var utils = require('../utils');

function getSubscriptions(environment, username, password, tenant, callback) {
  environment.acquireToken(username, password, tenant, function (err, authContext) {
    if (err) return callback(err);
    username = _crossCheckUserNameWithToken(username, authContext.userId);

    async.waterfall([
      function (callback) {
        _buildTenantList(environment, username, password, tenant, authContext, callback);
      },
      function (tenantList, callback) {
        getSubscriptionsFromTenants(environment, username, tenantList, callback);
      },
    ], function (err, subscriptions) {
      callback(err, subscriptions);
    });
  });
}

function getSubscriptionsFromTenants(environment, username, tenantList, callback) {
  var subscriptions = [];
  async.eachSeries(tenantList, function (tenant, cb) {
    var tenantId = tenant.tenantId;
    var armClient = environment.getArmClient(_createCredential(tenant.authContext));
    armClient.subscriptions.list(function (err, result) {
      if (!err) {
        subscriptions = subscriptions.concat(result.subscriptions.map(function (s) {
          s.activeDirectoryTenantId = tenantId;
          s.username = username;
          return s;
        }));
      }
      cb(err);
    });
  }, function (err) {
    callback(err, subscriptions);
  });
}

function _buildTenantList(environment, username, password, tenant, authContext, callback) {
  var tenants = [];
  if (tenant) {
    tenants = [{
      tenantId: tenant,//'tenant' could be a logical name, interchangable with a tenant guid though
      authContext: authContext
    }];
    return callback(null, tenants);
  }
  var armClient = environment.getArmClient(_createCredential(authContext));
  armClient.tenants.list(function (err, result) {
    if (err) return callback(err);
    async.eachSeries(result.tenantIds/*'tenantInfos' could be a better name*/, function (tenantInfo, cb) {
      environment.acquireToken(username, password, tenantInfo.tenantId, function (err, authContext) {
        //TODO: verify
        if (err && err.match(new RegExp('.*\"error_codes\":\\[50034|50000\\].*'))) {
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
}

function _crossCheckUserNameWithToken(usernameFromCommandline, userIdFromToken) {
  //to maintain the casing consistency between 'azureprofile.json' and token cache. (RD 1996587)
  //use the 'userId' here, which should be the same with "username" except the casing.
  if (utils.ignoreCaseEquals(usernameFromCommandline, userIdFromToken)) {
    return userIdFromToken;
  } else {
    throw new Error(util.format('invalid user name %s', usernameFromCommandline));
  }
}

function _createCredential(authContext) {
  return new AccessTokenCloudCredentials(authContext, 'notUsed');
}

__.extend(exports, {
  getSubscriptions: getSubscriptions,
  getSubscriptionsFromTenants: getSubscriptionsFromTenants
});
