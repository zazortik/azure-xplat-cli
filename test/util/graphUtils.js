require('streamline').register();

var util = require('util');
var azurExtra = require('azure-extra');

var profile = require('../../lib/util/profile');

var subscription = profile.current.getSubscription(process.env.AZURE_AD_SUBSCRIPTION);
var graphClient = new azurExtra.createGraphRbacManagementClient(subscription.tenantId, 
	                                                              subscription._createCredentials(),
	                                                              subscription.activeDirectoryGraphResourceId);
var groups = {};
var users = {};
var sps = {};

var exports = module.exports;


exports.createGroup = function (groupName, callback) {
  if (groups[groupName]) {
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
      groupInfo['displayName'] = result['group']['displayName'];
      groupInfo['objectId'] = result['group']['objectId'];
      groups[groupName] = groupInfo;
      console.log("groups object after adding group " + groupName + " : " + util.inspect(groups, {depth: null}));
      return callback(null, groupInfo);
    }
  });
};

exports.getGroupObjectId = function (groupName) {
  if (!groups[groupName]) {
    throw new Error('AD group ' + groupName + ' does not exist.');
  }
  return groups[groupName]['objectId'];
};

exports.deleteGroup = function (groupName, callback) {
  if (!groups[groupName]) {
    throw new Error('AD group ' + groupName + ' was not created. Hence cannot delete it.');
  }
  
  var groupObjectId = groups[groupName]['objectId'];
  graphClient.group.delete(groupObjectId, function (err, result) {
    if (err) {
      throw err;
    }
    else {
      delete groups[groupName];
      console.log("groups object after removing group " + groupName + " : " + util.inspect(groups, {depth: null}));
      return callback(null, result);
    }
  });
};

exports.createUser = function (upn, password, callback) {
  if (users[upn]) {
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
      console.log("users object after adding user " + upn + " : " + util.inspect(users, {depth: null}));
      return callback(null, userInfo);
    }
  });
};

exports.getUserObjectId = function (upn) {
  if (!users[upn]) {
    throw new Error('AD user ' + upn + ' does not exist.');
  }
  return users[upn]['objectId'];
};

exports.deleteUser = function (upn, callback) {
  if (!users[upn]) {
    throw new Error('AD user ' + upn + ' was not created. Hence cannot delete it.');
  }

  graphClient.user.delete(upn, function (err, result) {
    if (err) {
      throw err;
    }
    else {
      delete users[upn];
      console.log("users object after removing user " + upn + " : " + util.inspect(users, {depth: null}));
      return callback(null, result);
    }
  });
};

exports.addGroupMember = function (groupName, memberName, memberType, callback) {
  if (memberType === null || memberType === undefined) {
    throw new Error('memberType cannot be null. Valid values group or user.')
  }

  //get the group objectId
  if(!groups[groupName]) {
    throw new Error('AD group ' + groupName + ' does not exist. Hence cannot add members to it.');
  }
  var groupObjectId = groups[groupName]['objectId'];
  
  //get the member objectId
  var memberInfo = {};
  var memberObjectId;
  if (memberType.toLowerCase() === 'user') {
    if (!users[memberName]) {
      throw new Error('AD user ' + memberName + ' was not created. Hence cannot add it as a group member.');
    }
    else {
      memberObjectId = users[memberName]['objectId'];
      memberInfo = users[memberName];
      memberInfo['memberType'] = memberType;
    }
  }
  else if (memberType.toLowerCase() === 'group') {
    if (!groups[memberName]) {
      throw new Error('AD group ' + memberName + ' was not created. Hence cannot add it as a group member.');
    }
    else {
      memberObjectId = groups[memberName]['objectId'];
      memberInfo = groups[memberName];
      memberInfo['memberType'] = memberType;
    }
  }

  //construct memberUrl
  var memberUrl = graphClient.baseUri + graphClient.tenantID + '/directoryObjects/' + memberObjectId;
  var memberParams = {
    'memberUrl': memberUrl
  };
  graphClient.group.addMember(groupObjectId, memberParams, function (err, result) {
    if (err) {
      throw err;
    }
    groups[groupName]['member'] = {};
    groups[groupName]['member'][memberName] = memberInfo;
    console.log("groups object after adding member " + memberName + " : "+ util.inspect(groups, {depth: null}));
    return callback(null, result);
  });
};

exports.removeMember = function (groupName, memberName, memberType, callback) {
  if (memberType === null || memberType === undefined) {
    throw new Error('memberType cannot be null. Valid values group or user.')
  }

  //get the group objectId
  if(!groups[groupName]) {
    throw new Error('AD group ' + groupName + ' does not exist. Hence cannot remove members from it.');
  }
  var groupObjectId = groups[groupName]['objectId'];
  
  //get the member objectId
  var memberObjectId;
  if (memberType.toLowerCase() === 'user') {
    if (!users[memberName]) {
      throw new Error('AD user ' + memberName + ' was not created. Hence cannot remove it as a group member.');
    }
    else {
      memberObjectId = users[memberName]['objectId'];
    }
  }
  else if (memberType.toLowerCase() === 'group') {
    if (!groups[memberName]) {
      throw new Error('AD group ' + memberName + ' was not created. Hence cannot remove it as a group member.');
    }
    else {
      memberObjectId = groups[memberName]['objectId'];
    }
  }

  graphClient.group.removeMember(groupObjectId, memberObjectId, function (err, result) {
    if (err) {
      throw err;
    }
    delete groups[groupName]['member'][memberName];
    console.log("groups object after removing member " + memberName + " : "+ util.inspect(groups, {depth: null}));
    return callback(null, result);
  });
};