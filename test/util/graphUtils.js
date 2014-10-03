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
var azureExtra = require('azure-extra');

var profile = require('../../lib/util/profile');


var graphClient;
var exports = module.exports;

function createGraphClient() {
  var subscription = profile.current.getSubscription();
  graphClient = new azureExtra.createGraphRbacManagementClient(subscription.tenantId, 
                                                                 subscription._createCredentials(),
                                                                 subscription.activeDirectoryGraphResourceId);
}

exports.createGroup = function (groupName, callback) {
  createGraphClient();
  var createParams = {};
  createParams['displayName'] = groupName;
  createParams['mailEnabled'] = 'false';
  createParams['mailNickname'] = groupName;
  createParams['securityEnabled'] = 'true';

  var groupInfo = {};
  graphClient.group.create(createParams, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      groupInfo['displayName'] = result['group']['displayName'];
      groupInfo['objectId'] = result['group']['objectId'];
      groupInfo['objectType'] = 'group';
      return callback(null, groupInfo);
    }
  });
};

exports.deleteGroup = function (groupInfo, callback) {
  createGraphClient();
  var groupObjectId = groupInfo['objectId'];
  graphClient.group.delete(groupObjectId, function (err, result) {
    if (err) {
      return callback(err);
    } else {
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
  userParams['accountEnabled'] = 'false';
  var pwdProfileParams = {};
  pwdProfileParams['password'] = password;
  pwdProfileParams['forceChangePasswordNextLogin'] = 'false';
  userParams['passwordProfileSettings'] = pwdProfileParams;
  
  var userInfo = {};
  graphClient.user.create(userParams, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      userInfo['upn'] = result.user.userPrincipalName;
      userInfo['objectId'] = result.user.objectId;
      userInfo['password'] = password;
      userInfo['objectType'] = 'user';
      return callback(null, userInfo);
    }
  });
};

exports.deleteUser = function (userInfo, callback) {
  createGraphClient();
  var upn = userInfo.upn;
  graphClient.user.delete(upn, function (err, result) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, result);
    }
  });
};

exports.addGroupMember = function (groupInfo, memberInfo, callback) {
  createGraphClient();
  var groupObjectId = groupInfo['objectId'];
  
  var memberObjectId = memberInfo['objectId'];
  
  //construct memberUrl
  var memberUrl = graphClient.baseUri + graphClient.tenantID + '/directoryObjects/' + memberObjectId;
  var memberParams = {
    'memberUrl': memberUrl
  };
  graphClient.group.addMember(groupObjectId, memberParams, function (err, result) {
    if (err) {
      return callback(err);
    }
    groupInfo['members'] = groupInfo['members'] || [];
    groupInfo['members'].push(memberInfo);
    return callback(null, result);
  });
};

exports.removeGroupMember = function (groupInfo, memberInfo, callback) {
  createGraphClient();
  var groupObjectId = groupInfo['objectId'];
  
  var memberObjectId = memberInfo['objectId'];

  graphClient.group.removeMember(groupObjectId, memberObjectId, function (err, result) {
    if (err) {
      return callback(err);
    }

    groupInfo['members'] = groupInfo.members.filter(function (m) { return memberInfo.objectId !== m.objectId; });
    return callback(null, result);
  });
};

exports.createSP = function (appName, callback) {
  createGraphClient();
  var url = 'http://' + appName + '/home';
  var appParams = {};
  appParams['availableToOtherTenants'] = 'false';
  appParams['displayName'] = appName;
  appParams['homepage'] = url;
  appParams['identifierUris'] = [url];
  appParams['replyUrls'] = [url];
  var spInfo = {};
  graphClient.application.create(appParams, function (err, appResult) {
    if (err) {
      return callback(err);
    }
    var spParams = {};
    spParams['appId'] = appResult['application']['appId'];
    spParams['accountEnabled'] = 'true';
    graphClient.servicePrincipal.create(spParams, function (err, spResult) {
      if (err) {
        return callback(err);
      }
      spInfo = spResult.servicePrincipal;
      spInfo['application'] = appResult['application'];
      callback(null, spInfo);
    })
  });
};

exports.deleteSP = function(spInfo, callback) {
  createGraphClient();
  var spObjectId = spInfo['objectId'];
  var appObjectId = spInfo['application']['objectId'];
  graphClient.servicePrincipal.delete(spObjectId, function (err, spResult) {
    if (err) {
      return callback(err);
    }
    graphClient.application.delete(appObjectId, function (err, appResult) {
      if (err) {
        return callback(err);
      }
      return callback(null, spResult)
    });
  });
};