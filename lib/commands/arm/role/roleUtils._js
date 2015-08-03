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

var underscore = require('underscore');
var utils = require('../../../util/utils');
var permissionsUtils = require('./permissionsUtils');
var util = require('util');
var fs = require('fs');

var $ = utils.getLocaleString;

function validateRole(role, _) {
  if (underscore.isEmpty(role.name)) {
   throw new Error($('RoleDefinition Name is invalid'));
 }

  if (underscore.isEmpty(role.assignableScopes)) {
    throw new Error($('RoleDefinition AssignableScopes is invalid'));
  }

  if (underscore.isEmpty(role.actions)) {
    throw new Error($('RoleDefinition Actions is invalid'));
  }
};

function toCamelCase(obj, _) {
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

exports.showRoleDefinition = function (log, role) {
  log.data($('Name'), role.roleDefinition.properties.roleName);
  log.data($('Id'), role.roleDefinition.id);
  log.data($('Description'), role.roleDefinition.properties.description);
  var permissionDetails = permissionsUtils.getPermissionDetails(role.roleDefinition.properties.permissions);
  log.data($('Actions') + permissionDetails.actions);
  log.data($('NotActions') + permissionDetails.notActions);
  log.data($('AssignableScopes'), role.roleDefinition.properties.assignableScopes);
  log.data('');
}

exports.getRoleToCreateFromOptions = function (inputfile, roledefinition, _) {
  var roleToCreate;
  if (inputfile) {
    var exists = fs.existsSync(inputfile);

    if (exists) {
      var filecontent = fs.readFileSync(inputfile);
      try {
        roleToCreate = JSON.parse(filecontent);
      } catch (e) {
        throw new Error($('Deserializing the input role definition failed'));
      }
    } else {
      throw new Error(util.format($('File %s does not exist'), inputfile));
    }
  } else {
    roleToCreate = roledefinition;
  }

  return roleToCreate;
}

exports.validateAndConstructRoleDefinitionParameters = function (cli, role, _) {
  cli.output.info($('Validating role definition'));

  // Attempts to convert property names to camelCase by lower-casing the first letter of the property
  // i.e. If user specifies "AssignableScopes" or "assignableScopes" as property-name this will work,
  // but not if "assignablescopes" is specified
  var newRole = toCamelCase(role, _);

  validateRole(newRole, _);

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
    type: "CustomRole"
  };

  var parameters = {
    roleDefinition: {
      name: newRoleDefinitionNameGuid,
      properties: roleProperties
    }
  };

  return parameters;
};

