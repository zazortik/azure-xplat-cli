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

var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

exports.getADGraphClient = function getADGraphClient(subscription) {
  return utils.createGraphManagementClient(subscription);
};

exports.getObjectId = function (principal, graphClient, throwIfNoOption, shouldRetrieveObjectType, objectType, _) {
  if (principal.objectId) {
    // get object type if requested
    if (shouldRetrieveObjectType) {
      var objects = graphClient.objectOperations.getObjectsByObjectIds({ ids: new Array(principal.objectId), includeDirectoryObjectReferences: true }, _);
      if (objects && objects.length > 0) {
        objectType.value = objects[0].objectType;
      }
    }

    return principal.objectId;
  }

  var parameters = null;
  if (principal.signInName) {
    parameters = { filter: 'userPrincipalName eq \'' + principal.signInName + '\'' };
    var users = graphClient.userOperations.list(parameters, _);
    if (users.length > 0) {
      objectType.value = 'user';
      return users[0].objectId;
    } else {
      throw new Error($('Invalid user signInName')); 
    }
  }

  if (principal.spn) {
    parameters = { filter: 'servicePrincipalNames/any(c:c eq \'' + principal.spn + '\')' };
    var servicePrincipals = graphClient.servicePrincipalOperations.list(parameters, _);

    if (servicePrincipals.length > 0) {
      objectType.value = 'servicePrincipal';
      return servicePrincipals[0].objectId;
    } else {
      throw new Error($('Invalid service principal name'));
    }
  }
  if (throwIfNoOption) {
    throw new Error($('Failed to retrieve Active Dirctory Object Id'));
  } else {
    objectType.value = '';
    return '';
  }
};

exports.validateParameters = function (parameters, throwOnNoValues) {
  throwOnNoValues = (typeof throwOnNoValues !== 'undefined' ? throwOnNoValues : true);
  var parameterNames = Object.keys(parameters);

  //empty object is fine.
  if (parameterNames.length === 0) {
    return;
  }

  var values = parameterNames.filter(function (p) {
    return (!!parameters[p]);
  });

  if (values.length === 0 && throwOnNoValues) {
    throw new Error(util.format(('Please provide a value to one of the parameters \'%s\''), parameterNames.join()));
  }

  if (values.length > 1) {
    throw new Error(util.format($('You can only specify value to one of \'%s\''), values.join()));
  }
};

exports.listGraphObjects = function (client, objectType, interaction, log, _) {
  function displayObjects(objects) {
    if (objects.length === 0) {
      return;
    }
    if (utils.ignoreCaseEquals(objectType, 'user')) {
      exports.displayUsers(objects, interaction, log);
    } else if (utils.ignoreCaseEquals(objectType, 'group')) {
      exports.displayGroups(objects, interaction, log);
    } else if (utils.ignoreCaseEquals(objectType, 'servicePrincipal')) {
      exports.displayServicePrincipals(objects, interaction, log);
    }
  }

  var operationsSuffix = 'Operations';
  var response = client[objectType + operationsSuffix].list(null, _);
  var nextLink = response.odatanextLink;
  while (nextLink) {
    var response2 = client[objectType + operationsSuffix].listNext(nextLink, _);
    // merge new objects to the existing array
    response.push.apply(response, response2);
    nextLink = response2.odatanextLink;
  }

  displayObjects(response);
};

exports.listGroupMembers = function (client, groupId, interaction, log, _) {
  var groupMembers = client.groupOperations.getGroupMembers(groupId, _);
  var nextLink = groupMembers.odatanextLink;

  while (nextLink) {
    var groupMembers2 = client.groupOperations.getGroupMembersNext(nextLink, _);
    // merge new objects to the existing array
    groupMembers.push.apply(groupMembers, groupMembers2);
    nextLink = groupMembers2.odatanextLink;
  }

  displayGroupMembers(groupMembers, interaction, log);
};

exports.displayApplications = function (applications, interaction, log) {
  interaction.formatOutput(applications, function (data) {
    for (var i = 0; i < data.length; i++) {
      exports.displayAApplication(data[i], log);
      log.data('');
    }
  });
};

exports.displayUsers = function (users, interaction, log) {
  interaction.formatOutput(users, function (data) {
    for (var i = 0; i < data.length; i++) {
      displayAUser(data[i], log);
      log.data('');
    }
  });
};

exports.displayGroups = function (groups, interaction, log) {
  interaction.formatOutput(groups, function (data) {
    for (var i = 0; i < data.length; i++) {
      displayAGroup(data[i], log);
      log.data('');
    }
  });
};

exports.displayServicePrincipals = function (servicePrincipals, interaction, log) {
  interaction.formatOutput(servicePrincipals, function (data) {
    for (var i = 0; i < data.length; i++) {
      exports.displayAServicePrincipal(data[i], log);
      log.data('');
    }
  });
};

exports.displayAServicePrincipal = function (servicePrincipal, log, showType) {
  log.data($('Object Id:              '), servicePrincipal.objectId);
  log.data($('Display Name:           '), servicePrincipal.displayName);
  log.data($('Service Principal Names:'));
  servicePrincipal.servicePrincipalNames.forEach(function (name) {
    log.data($('                        '), name);
  });
  if (showType) {
    log.data($('Object Type:          '), 'ServicePrincipal');
  }
};

exports.displayAApplication = function (application, log) {
  log.data($('AppId:                  '), application.appId);
  log.data($('ObjectId:               '), application.objectId);
  log.data($('DisplayName:            '), application.displayName);
  log.data($('IdentifierUris:         '), application.identifierUris);
  log.data($('ReplyUrls:              '), application.replyUrls);
  log.data($('AvailableToOtherTenants: '), application.availableToOtherTenants ? 'True' : 'False');
  if (application.appPermissions) {
    log.data($('AppPermissions:       '));
    Object.keys(application.appPermissions).forEach(function (item) {
      if (application.appPermissions[item]) {
        Object.keys(application.appPermissions[item]).forEach(function (subItem) {
          log.data($('                         ' + subItem + ': '), application.appPermissions[item][subItem]);
        });
      }
    });
  }
};

function displayGroupMembers(members, interaction, log) {
  interaction.formatOutput(members, function (data) {
    for (var i = 0; i < data.length; i++) {
      if (data[i].objectType === 'User') {
        displayAUser(data[i], log, true);
      } else if (data[i].objectType === 'Group') {
        displayAGroup(data[i], log, true);
      } else {
        log.warn('an unexpected object type:' + data[i].objectType);
      }
      log.data('');
    }
  });
}

function displayAUser(user, log, showType) {
  log.data($('Object Id:      '), user.objectId);
  log.data($('Principal Name: '), user.userPrincipalName);
  log.data($('Display Name:   '), user.displayName);
  log.data($('E-Mail:         '), user.mail || user.signInName);
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
