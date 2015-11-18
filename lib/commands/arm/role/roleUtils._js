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
var utils = require('../../../util/utils');
var utilsCore = require('../../../util/utilsCore');
var permissionsUtils = require('./permissionsUtils');
var util = require('util');
var fs = require('fs');
var rbacConstants = require('./rbacConstants');

var $ = utils.getLocaleString;

function validateRole(role) {
  if (__.isEmpty(role.name)) {
   throw new Error($('RoleDefinition Name is invalid'));
 }
  
  if (__.isEmpty(role.description)) {
    throw new Error($('RoleDefinition Description is invalid'));
  }

  if (__.isEmpty(role.assignableScopes)) {
    throw new Error($('RoleDefinition AssignableScopes is invalid'));
  }

  role.assignableScopes.forEach(function(assignableScope) {
    if (__.isEmpty(assignableScope)) {
      throw new Error($('RoleDefinition AssignableScope value is null or empty'));
    }
  });

  if (__.isEmpty(role.actions)) {
    throw new Error($('RoleDefinition Actions is invalid'));
  }
}

function toCamelCase(obj) {
  var key, destKey, value;
  var camelCasedObj = {};
  if (obj && typeof obj === 'object')
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      destKey = (key.charAt(0).toLowerCase() + key.substring(1)).toString();
      value = obj[key];
      camelCasedObj[destKey] = value;
    }
  }

  return camelCasedObj;
}

exports.showRoleDefinition = function (role, log, hideDetails) {
  log.data($('Name             :'), role.Name);
  if (!hideDetails) {
    log.data($('Id               :'), role.Id);
    log.data($('Description      :'), role.Description);
    log.data($('AssignableScopes :'), role.AssignableScopes);
  }
  log.data($('Actions          :'), role.Actions);
  log.data($('NotActions       :'), role.NotActions);
  log.data($('IsCustom         :'), role.IsCustom);
  log.data('');
};

exports.NormalizeRoleDefinitionObject = function (role) {
  if (role) {
    var normalizedRole = {};
    var permissionDetails = permissionsUtils.getPermissionDetails(role.properties.permissions);
    normalizedRole.Name = role.properties.roleName;
    normalizedRole.Actions = permissionDetails.actions;
    normalizedRole.NotActions = permissionDetails.notActions;
    normalizedRole.Id = role.id;
    normalizedRole.AssignableScopes = role.properties.assignableScopes;
    normalizedRole.Description = role.properties.description;
    normalizedRole.IsCustom = utilsCore.ignoreCaseEquals(role.properties.type, rbacConstants.CUSTOM_ROLE_TYPE) ? 'true' : 'false';
    return normalizedRole;
  }
};

exports.getRoleDefinitionName = function (roleDefintionResourceID) {
  // to extract out the <guid> from definition id like '/subscriptions/358f3860-9dbe-4ace-b0c0-3d4f2d861014/providers/.../<guid>'
  return roleDefintionResourceID.substring(roleDefintionResourceID.lastIndexOf('/') + 1);
};

exports.getRoleDefinitionFullyQualifiedId = function (roleDefinitionNormalizedId, subscriptionId) {
  // to generate the fully qualified role definition id from guid.
  return util.format(rbacConstants.RoleDefinitionIdPrefixFormat, subscriptionId) + roleDefinitionNormalizedId;
};

exports.getRoleToCreateOrUpdate = function(inputfile, roledefinition) {
  var roleToCreateOrUpdate;
  if (inputfile) {
    var exists = fs.existsSync(inputfile);

    if (exists) {
      var filecontent = fs.readFileSync(inputfile);
      try {
        roleToCreateOrUpdate = JSON.parse(filecontent);
      } catch (e) {
        throw new Error($('Deserializing the input role definition failed'));
      }
    } else {
      // exists = false
      throw new Error(util.format($('File %s does not exist'), inputfile));
    }
  } else {
    // no inputfile, JSON string provided
    try {
      roleToCreateOrUpdate = JSON.parse(roledefinition);
    } catch (e) {
      throw new Error($('Deserializing the input role definition failed'));
    }
  }

  return toCamelCase(roleToCreateOrUpdate);
};

exports.validateAndConstructCreateParameters = function (cli, role) {
  cli.output.info($('Validating role definition'));

  // Attempts to convert property names to camelCase by lower-casing the first letter of the property
  // i.e. If user specifies "AssignableScopes" or "assignableScopes" as property-name this will work,
  // but not if "assignablescopes" is specified
  var newRole = toCamelCase(role);

  validateRole(newRole);

  var newRoleDefinitionNameGuid = utils.uuidGen();

  var roleProperties = {
    assignableScopes: newRole.assignableScopes,
    description: newRole.description,
    permissions: [
      {
        actions: newRole.actions,
        notActions: newRole.notActions
      }
    ],
    roleName: newRole.name,
    type: rbacConstants.CUSTOM_ROLE_TYPE
  };

  var parameters = {
    roleDefinition: {
      name: newRoleDefinitionNameGuid,
      properties: roleProperties
    }
  };

  return parameters;
};

exports.constructRoleDefinitionUpdateParameters = function (cli, inputrole, roleFromService) {
  // Attempts to convert property names of the (user) input role to camelCase by lower-casing the first letter of the property
  // i.e. If user specifies "AssignableScopes" or "assignableScopes" as property-name this will work, but not if "assignablescopes" is specified
  // roleFromService will already have properties camelcased.
  var inputRoleCamelcased = toCamelCase(inputrole);

  // Extract Actions and NotActions list from existing role
  var existingRoleActions = [];
  var existingRoleNotActions = [];
  if (roleFromService.properties.permissions) {
    roleFromService.properties.permissions.forEach(function (permission) {
      if (permission.actions) {
        existingRoleActions = existingRoleActions.concat(permission.actions);
      }
      if (permission.notActions) {
        existingRoleNotActions = existingRoleNotActions.concat(permission.notActions);
      }
    });
  }
  
  var newRole = {};

  // Merge properties from user input and the GET result from service
  newRole.name = (!inputRoleCamelcased.name) ? roleFromService.properties.roleName : inputRoleCamelcased.name;
  newRole.actions = (!inputRoleCamelcased.actions) ? existingRoleActions : inputRoleCamelcased.actions;
  newRole.notActions = (!inputRoleCamelcased.notActions) ? existingRoleNotActions : inputRoleCamelcased.notActions;
  newRole.assignableScopes = (!inputRoleCamelcased.assignableScopes) ? roleFromService.properties.assignableScopes : inputRoleCamelcased.assignableScopes;
  newRole.description = (!inputRoleCamelcased.description) ? roleFromService.properties.description : inputRoleCamelcased.description;
  
  validateRole(newRole);

  var roleProperties = {
    assignableScopes: newRole.assignableScopes,
    description: newRole.description,
    permissions: [
      {
        actions: newRole.actions,
        notActions: newRole.notActions
      }
    ],
    roleName: newRole.name,
    type: rbacConstants.CUSTOM_ROLE_TYPE
  };

  // Get the last segment as the roleid(name)
  var scopes = roleFromService.id.split('/');
  var roleDefinitionId = scopes[scopes.length - 1];

  var parameters = {
    roleDefinition: {
      id: roleFromService.id,
      name: roleDefinitionId,
      properties: roleProperties
    }
  };

  return parameters;
};


