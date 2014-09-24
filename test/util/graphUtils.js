require('streamline').register();

var util = require('util');
var azurExtra = require('azure-extra');

var profile = require('../../lib/util/profile');

var subscription = profile.current.getSubscription("Free Trial");
var graphClient = new azurExtra.createGraphRbacManagementClient(subscription.tenantId, 
	                                                              subscription._createCredentials(),
	                                                              subscription.activeDirectoryGraphResourceId);

var groups = {};
var users = {};
var servicePrincipals = {};

var exports = module.exports;

var callback = function (err, result) {
  if (err) {
    console.log('err: ' + util.inspect(err, {depth: null}));
  }
  else {
    console.log('result is: ' + util.inspect(result, {depth: null}));
    if(result.group) {
      groups[result.group.displayName] = result.group.objectId;
      console.log('groups: ' + util.inspect(groups, {depth: null}));
      graphClient.group.delete(groups.testgroup1, callback);
    }
  }
}



exports.createGroup = function (groupName) {
  if (groups.groupName) {
    throw new Error('AD group ' + groupName + ' already exists. Hence cannot recreate it.');
  }

  var createParams = {};
  createParams['displayName'] = groupName;
  createParams['mailEnabled'] = 'false';
  createParams['mailNickname'] = groupName;
  createParams['securityEnabled'] = 'true';

  var groupInfo = {};
  graphClient.group.create(createParams, function (err, result) {
    if (err) {
      throw err;
    }
    else {
      groupInfo['displayName'] = result.group.displayName;
      groupInfo['objectId'] = result.group.objectId;
      groups[result.group.displayName] = groupInfo;
      return groupInfo;
    }
  });
};

exports.deleteGroup = function (groupName) {
  if (!groups.groupName) {
    throw new Error('AD group ' + groupName + ' was not created. Hence cannot delete it.');
  }

  graphClient.group.delete(groups.groupName.objectId, function (err, result) {
    if (err) {
      throw err;
    }
    else {
      delete groups.groupName;
    }
  });
};

exports.createUser = function (upn, password) {
  if (users.upn) {
    throw new Error('AD user ' + upn + ' already exists. Hence cannot recreate it.');
  }
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
      throw err;
    }
    else {
      console.log('result is: ' + util.inspect(result, {depth: null}));
      userInfo['upn'] = result.user.userPrincipalName;
      userInfo['objectId'] = result.user.objectId;
      userInfo['password'] = password;
      users[upn] = userInfo;
      return userInfo;
    }
  });
};

exports.deleteUser = function (upn) {
  if (!users.upn) {
    throw new Error('AD user ' + upn + ' was not created. Hence cannot delete it.');
  }

  graphClient.user.delete(upn, function (err, result) {
    if (err) {
      throw err;
    }
    else {
      delete users.upn;
    }
  });
};