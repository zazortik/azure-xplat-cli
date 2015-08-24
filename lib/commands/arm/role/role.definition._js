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

var permissionsUtils = require('./permissionsUtils');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var util = require('util');

var rbacClients = require('./rbacClients');
var roleUtils = require('./roleUtils');
var rbacConstants = require('./rbacConstants');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var role = cli.category('role')
    .description($('Commands to manage your Azure roles'));

  role.command('list')
    .option('--custom', $('If given, display only the custom roles instead of all role definitions'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .description($('Get all available role definitions'))
    .execute(function (options, _) {
    var subscription = profile.current.getSubscription(options.subscription);
    var client = rbacClients.getAuthzClient(subscription);
    var progress = cli.interaction.progress($('Listing role definitions'));
    var result;
    try {
      result = client.roleDefinitions.list(_);
    } finally {
      progress.end();
    }
    
    if (options.custom) {
      result.roleDefinitions = result.roleDefinitions.filter(function (r) {
        return utils.ignoreCaseEquals(r.properties.type, rbacConstants.CUSTOM_ROLE_TYPE);
      });
    }
    
    cli.interaction.formatOutput(result.roleDefinitions, function (data) {
      if (data.length === 0) {
        log.info($('No role definition defined'));
      } else {
        log.table(data, displayARoleDefinition);
      }
    });
  });

  role.command('show [name]')
    .description($('Get an available role definition'))
    .option('-n --name <name>', $('the role definition name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, options, _) {
      if (!name) {
        return cli.missingArgument('name');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = rbacClients.getAuthzClient(subscription);
      var progress = cli.interaction.progress($('Getting role definitions'));
      var result;
      try {
        //'roleDefinitions.get' only takes guid, so we just do list and find by name ourselves
        result = client.roleDefinitions.list(_);
      } finally {
        progress.end();
      }

      var roles = result.roleDefinitions.filter(function(r) {
        return utils.ignoreCaseEquals(r.properties.roleName, name);
      });

      cli.interaction.formatOutput(roles, function(data) {
        if (data.length === 0) {
          log.info($('No role definition found'));
        } else {
          log.table(data, displayARoleDefinition);
        }
      });
    });

  role.command('create [inputfile] [roledefinition]')
    .description($('create a new role definition'))
    .option('-f --inputfile <inputfile>', $('File name containing a single role definition.'))
    .option('-r --roledefinition <roledefinition>', $('A JSON-formatted string containing the role definition. For e.g. {"Name": "Test Role","Description": "Test role","Actions": ["Microsoft.Support/*/read"],"Notactions": [],"AssignableScopes": ["/subscriptions/4004a9fd-d58e-48dc-aeb2-4a4aec58606f"]}'))
    .option('--subscription <subscription>', $('The subscription identifier'))
    .execute(function(inputfile, roledefinition, options, _) {
      if (inputfile && roledefinition) {
        throw new Error($('Either inputfile or roledefinition need to be specified. Not both.'));
      }

      if (!inputfile && !roledefinition) {
        throw new Error($('At least one of inputfile or roledefinition need to be specified.'));
      }

      var roleToCreate = roleUtils.getRoleToCreateOrUpdate(inputfile, roledefinition);
      var parameters = roleUtils.validateAndConstructCreateParameters(cli, roleToCreate);

      var subscription = profile.current.getSubscription(options.subscription);
      var authzClient = rbacClients.getAuthzClient(subscription);

      var roleDefinitionIdGuid = parameters.roleDefinition.name;
      var doneMessage = util.format($('Created role definition %s'), roleDefinitionIdGuid);
      var roleDef = null;
      cli.interaction.withProgress(util.format($('Creating role definition "%s"'), roleDefinitionIdGuid),
        function(log, _) {
          roleDef = authzClient.roleDefinitions.createOrUpdate(roleDefinitionIdGuid, parameters, _);
        }, _);

      log.info(doneMessage);
      cli.interaction.formatOutput(roleDef, function(role) {
        if (role) {
          roleUtils.showRoleDefinition(role, log);
        }
      });
    });

  role.command('set [inputfile] [roledefinition]')
    .description($('update an existing role definition'))
    .option('-f --inputfile <inputfile>', $('File name containing a single role definition.'))
    .option('-r --roledefinition <roledefinition>', $('A JSON-formatted string containing the role definition. For e.g. {"Name": "Test Role","Description": "Test role","Actions": ["Microsoft.Support/*/read"],"Notactions": [],"AssignableScopes": ["/subscriptions/5004a9fd-d58e-48dc-aeb2-4a4aec58606f"]}'))
    .option('--subscription <subscription>', $('The subscription identifier'))
    .execute(function(inputfile, roledefinition, options, _) {
      if (inputfile && roledefinition) {
        throw new Error($('Either inputfile or roledefinition need to be specified. Not both.'));
      }

      if (!inputfile && !roledefinition) {
        throw new Error($('At least one of inputfile or roledefinition need to be specified.'));
      }

      var inputRole = roleUtils.getRoleToCreateOrUpdate(inputfile, roledefinition);

      var subscription = profile.current.getSubscription(options.subscription);
      var authzClient = rbacClients.getAuthzClient(subscription);
      var progress = cli.interaction.progress($('Getting role definition'));
      var getResult = null;
      try {
        getResult = authzClient.roleDefinitions.getById(inputRole.id, _);
      } finally {
        progress.end();
      }

      if (!getResult) {
        throw new Error($('Cannot find roledefinition with id: %s', inputRole.id));
      }

      var parameters = roleUtils.constructRoleDefinitionUpdateParameters(cli, inputRole, getResult);
      var roleDefinitionIdGuid = parameters.roleDefinition.name;
      var doneMessage = util.format($('Updated role definition %s'), roleDefinitionIdGuid);

      var roleDef = null;
      cli.interaction.withProgress(util.format($('Updating role definition "%s"'), roleDefinitionIdGuid),
        function(log, _) {
          roleDef = authzClient.roleDefinitions.createOrUpdate(roleDefinitionIdGuid, parameters, _);
        }, _);

      log.info(doneMessage);
      cli.interaction.formatOutput(roleDef, function(role) {
        if (role) {
          roleUtils.showRoleDefinition(role, log);
        }
      });
    });

  function displayARoleDefinition(row, role) {
    row.cell($('Name'), role.properties.roleName);
    row.cell($('Id'), role.id);
    row.cell($('IsCustom'), role.properties.type === rbacConstants.CUSTOM_ROLE_TYPE);
    row.cell($('Description'), role.properties.description);
    var permissionDetails = permissionsUtils.getPermissionDetails(role.properties.permissions);
    row.cell($('Actions'), permissionDetails.actions);
    row.cell($('NotActions'), permissionDetails.notActions);
    row.cell($('AssignableScopes'), role.properties.assignableScopes);
  }
};
