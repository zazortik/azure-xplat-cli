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

exports.getObjectId = function (principal, graphClient, throwIfNoOption, _) {
  if (principal.objectId) {
    return principal.objectId;
  }

  var graphQueryResult = null;
  if (principal.userPrincipalName) {
    graphQueryResult = graphClient.user.getBySignInName(principal.userPrincipalName, _);
    if (graphQueryResult.users.length > 0) {
      return graphQueryResult.users[0].objectId;
    } else {
      throw new Error($('Invalid user principal name')); 
    }
  }

  if (principal.mail) {
    graphQueryResult = graphClient.user.list(principal.mail, '', _);
    if (graphQueryResult.users.length > 0) {
      return graphQueryResult.users[0].objectId;
    } else {
      graphQueryResult = graphClient.group.list(principal.mail, '', _);
      if (graphQueryResult.groups.length > 0) { //TODO: error on 2+ matches
        return graphQueryResult.groups[0].objectId;
      } else {
        throw new Error($('Invalid mail'));
      }
    }
  }

  if (principal.servicePrincipalName) {
    graphQueryResult = graphClient.servicePrincipal.getByServicePrincipalName(principal.servicePrincipalName, _);
    if (graphQueryResult.servicePrincipals.length > 0) {
      return graphQueryResult.servicePrincipals[0].objectId;
    } else {
      throw new Error($('Invalid service principal name'));
    }
  }
  if (throwIfNoOption) {
    throw new Error($('Failed to retrieve Active Dirctory Object Id'));
  } else {
    return '';
  }
};

exports.listGraphObjects = function (client, objectType, log, _) {
  function displayObjects(objects) {
    if (objects.length === 0) {
      return;
    }
    if (objectType === 'user') {
      exports.displayUsers(objects, log);
    } else if (objectType === 'group') {
      exports.displayGroups(objects, log);
    } else {
      exports.displayServicePrincipals(objects, log);
    }
  }
  //TODO refactor this.
  var response;
  if (objectType !== 'servicePrincipal') {
    response = client[objectType].list('', '', _);
  } else {
    response = client[objectType].list('', _);
  }

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

exports.displayUsers = function (users, log) {
  for (var i = 0; i < users.length; i++) {
    displayAUser(users[i], log);
    log.data('');
  }
};

exports.displayGroups = function (groups, log) {
  for (var i = 0; i < groups.length; i++) {
    displayAGroup(groups[i], log);
    log.data('');
  }
};

exports.displayServicePrincipals = function (servicePrincipals, log) {
  for (var i = 0; i < servicePrincipals.length; i++) {
    displayAServicePrincipal(servicePrincipals[i], log);
    log.data('');
  }
};

function displayGroupMembers(members, log) {
  for (var i = 0; i < members.length; i++) {
    if (members[i].objectType === 'User') {
      displayAUser(members[i], log, true);
    } else if (members[i].objectType === 'Group') {
      displayAGroup(members[i], log, true);
    } else {
      log.warn('an unexpected object type:' + members[i].objectType);
    }
    log.data('');
  }
}

function displayAUser(user, log, showType) {
  log.data($('Object Id:      '), user.objectId);
  log.data($('Principal Name: '), user.userPrincipalName);
  log.data($('Display Name:   '), user.displayName);
  log.data($('E-Mail:         '), user.mail);
  if (showType) {
    log.data($('Object Type:    '), 'User');
  }
}

function displayAGroup(group, log, showType) {
  log.data($('Display Name:     '), group.displayName);
  log.data($('ObjectId:         '), group.objectId);
  log.data($('Security Enabled: '), group.securityEnabled);
  log.data($('Mail Enabled:     '), group.mailEnabled);
  if (showType) {
    log.data($('Object Type:      '), 'Group');
  }
}

function displayAServicePrincipal(servicePrincipal, log, showType) {
  log.data($('Display Name:           '), servicePrincipal.displayName);
  log.data($('Object Id:              '), servicePrincipal.objectId);
  log.data($('Service Principal Names:'));
  servicePrincipal.servicePrincipalNames.forEach(function (name) {
    log.data($('                        '), name);
  });
  if (showType) {
    log.data($('Object Type:          '), 'ServicePrincipal');
  }
}