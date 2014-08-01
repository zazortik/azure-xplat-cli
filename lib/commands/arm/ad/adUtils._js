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

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.listGraphObjects = function (client, objectType, log,  _) {
  function displayObjects(objects) {
    if (objects.length === 0){
      return;
    }
    if (objectType === 'user') {
      displayUsers(objects, log);
    } else {
      exports.displayGroups(objects, log);
    }
  }
  var response = client[objectType].list('', '', _);
  displayObjects(response[objectType + 's']);
  var nextLink = response.nextLink;

  while (nextLink) {
    response = client[objectType].listNext(nextLink, _);
    displayObjects(response[objectType + 's']);
    nextLink = response.nextLink;
  }
};

exports.listGroupMembers = function (client, groupId, log, _) {
  var response = client.group.getGroupMembers(groupId, _);
  displayGroupMembers(response.aADObject, log);
  var nextLink = response.nextLink;

  while (nextLink) {
    response = client.group.getGroupMembersNext(nextLink, _);
    displayGroupMembers(response.aADObject, log);
    nextLink = response.nextLink;
  }
};

exports.displayAUser = function (user, log, showType) {
  log.data($('Id:             '), user.objectId);
  log.data($('Principal Name: '), user.userPrincipalName);
  log.data($('Display Name:   '), user.displayName);
  log.data($('E-Mail:         '), user.mail);
  if (showType) {
    log.data($('Object Type:    '), 'User');
  }
};

exports.displayGroups = function (groups, log) {
  for (var i = 0; i < groups.length; i++) {
    displayAGroup(groups[i], log);
    log.data('');
  }
};

function displayGroupMembers(members, log) {
  for (var i = 0; i < members.length; i++) {
    if (members[i].objectType === 'User') {
      exports.displayAUser(members[i], log, true);
    } else if (members[i].objectType === 'Group') {
      displayAGroup(members[i], log, true);
    } else {
      log.warn('an unexpected object type:' + members[i].objectType);
    }
    log.data('');
  }
}

function displayUsers(users, log) {
  for (var i = 0; i < users.length; i++) {
    exports.displayAUser(users[i], log);
    log.data('');
  }
}

function displayAGroup(group, log, showType) {
  log.data($('Display Name:     '), group.displayName);
  log.data($('Id:               '), group.objectId);
  log.data($('Security Enabled: '), group.securityEnabled);
  log.data($('Mail Enabled:     '), group.mailEnabled);
  if (showType) {
    log.data($('Object Type:      '), 'Group');
  }
}