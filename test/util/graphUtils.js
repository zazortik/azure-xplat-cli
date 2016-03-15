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

require('streamline').register();

var util = require('util');

var profile = require('../../lib/util/profile');
var testLogger = require('../framework/test-logger');

var adUtils = require('../../lib/commands/arm/ad/adUtils');

var graphClient;
var exports = module.exports;

function createGraphClient() {
  var subscription = profile.current.getSubscription();
  graphClient = adUtils.getADGraphClient(subscription);
}

exports.createGroup = function (groupName, callback) {
  createGraphClient();
  var createParams = {};
  createParams['displayName'] = groupName;
  createParams['mailEnabled'] = false;
  createParams['mailNickname'] = groupName;
  createParams['securityEnabled'] = true;

  var groupInfo = {};
  graphClient.groupOperations.create(createParams, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      groupInfo['displayName'] = result['displayName'];
      groupInfo['objectId'] = result['objectId'];
      groupInfo['objectType'] = 'group';
      testLogger.logData("Created AD Group: ");
      testLogger.logData(groupInfo);
      return callback(null, groupInfo);
    }
  });
};

exports.deleteGroup = function (groupInfo, callback) {
  createGraphClient();
  var groupObjectId = groupInfo['objectId'];
  graphClient.groupOperations.deleteMethod(groupObjectId, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      testLogger.logData("Deleted AD Group: ");
      testLogger.logData(groupInfo);
      return callback(null, result);
    }
  });
};

exports.createUser = function (upn, password, callback) {
  createGraphClient();
  var userParams = {};
  userParams['userPrincipalName'] = upn;
  var username = upn.split('@')[0];
  userParams['displayName'] = username;
  userParams['mailNickname'] = username;
  userParams['accountEnabled'] = false;
  var pwdProfileParams = {};
  pwdProfileParams['password'] = password;
  pwdProfileParams['forceChangePasswordNextLogin'] = false;
  userParams['passwordProfile'] = pwdProfileParams;

  var userInfo = {};
  graphClient.userOperations.create(userParams, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      userInfo['upn'] = result.userPrincipalName;
      userInfo['objectId'] = result.objectId;
      userInfo['password'] = password;
      userInfo['objectType'] = 'user';
      testLogger.logData("Created AD User: ");
      testLogger.logData(userInfo);
      return callback(null, userInfo);
    }
  });
};

exports.deleteUser = function (userInfo, callback) {
  createGraphClient();
  var upn = userInfo.upn;
  graphClient.userOperations.deleteMethod(upn, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      testLogger.logData("Deleted AD User: ");
      testLogger.logData(userInfo);
      return callback(null, result);
    }
  });
};

exports.addGroupMember = function (groupInfo, memberInfo, callback) {
  createGraphClient();
  var groupObjectId = groupInfo['objectId'];

  var memberObjectId = memberInfo['objectId'];

  //construct memberUrl
  var url = graphClient.baseUri + '/' + graphClient.tenantID + '/directoryObjects/' + memberObjectId;

  graphClient.groupOperations.addMember(groupObjectId, url, function (err, result) {
    if (err) {
      return callback(err);
    }
    groupInfo['members'] = groupInfo['members'] || [];
    groupInfo['members'].push(memberInfo);
    testLogger.logData("Added member " + memberObjectId + ' to group ' + groupObjectId);
    return callback(null, result);
  });
};

exports.removeGroupMember = function (groupInfo, memberInfo, callback) {
  createGraphClient();
  var groupObjectId = groupInfo['objectId'];

  var memberObjectId = memberInfo['objectId'];

  graphClient.groupOperations.removeMember(groupObjectId, memberObjectId, function (err, result) {
    if (err) {
      return callback(err);
    }

    groupInfo['members'] = groupInfo.members.filter(function (m) { return memberInfo.objectId !== m.objectId; });
    testLogger.logData("Removed member " + memberObjectId + ' to group ' + groupObjectId);
    return callback(null, result);
  });
};

exports.createSP = function (appName, callback) {
  createGraphClient();
  var url = 'http://' + appName + '/home';
  var appParams = {};
  appParams['availableToOtherTenants'] = false;
  appParams['displayName'] = appName;
  appParams['homepage'] = url;
  appParams['identifierUris'] = [url];
  appParams['replyUrls'] = [url];
  var spInfo = {};
  graphClient.applicationOperations.create(appParams, function (err, appResult) {
    if (err) {
      return callback(err);
    }
    var spParams = {};
    spParams['appId'] = appResult['appId'];
    spParams['accountEnabled'] = true;
    graphClient.servicePrincipalOperations.create(spParams, function (err, spResult) {
      if (err) {
        return callback(err);
      }
      spInfo = spResult;
      spInfo['application'] = appResult;
      testLogger.logData("Created AD SP: ");
      testLogger.logData(spInfo);
      callback(null, spInfo);
    })
  });
};

exports.deleteSP = function(spInfo, callback) {
  createGraphClient();
  var spObjectId = spInfo['objectId'];
  var appObjectId = spInfo['application']['objectId'];
  graphClient.servicePrincipalOperations.deleteMethod(spObjectId, function (err, spResult) {
    if (err) {
      return callback(err);
    }
    graphClient.applicationOperations.deleteMethod(appObjectId, function (err, appResult) {
      if (err) {
        return callback(err);
      }
      testLogger.logData("Deleted AD SP: ");
      testLogger.logData(spInfo);
      return callback(null, spResult)
    });
  });
};