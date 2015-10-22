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

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var util = require('util');
var adUtils = require('../ad/adUtils');
var rbacClients = require('./rbacClients');
var roleUtils = require('./roleUtils');
var rbacConstants = require('./rbacConstants');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var role = cli.category('role')
    .description($('Commands to manage role definitions'));

  role.command('list')
     .usage(
       '\n' +
      '\n           -----    Example 1   -------' +
      '\n           azure role list' +
      '\n           Lists all RBAC role definitions.' +
      '\n')
    .option('--custom', $('If specified, display only the custom role definitions instead of all role definitions.'))
    .option('-d --detailed', $('If specified, displays all the properties of a role definition'))
    .option('--subscription <subscription>', $('Name or identifier of the subscription to list the roles for.'))
    .description($('Lists Azure RBAC roles available for assignment. Use this command to determine what actions on what resource types an Azure RBAC role allows.'))
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
    
    var hideDetails = true;
    if (options.detailed) {
      hideDetails = false;
    }

    var roles = roleUtils.getRoleDefinitionsWithNormalizedId(result.roleDefinitions);

    cli.interaction.formatOutput(roles, function (data) {
      if (data.length === 0) {
        log.info($('No role definitions of specified type were found'));
      } else {
        data.forEach(function (role) {
          roleUtils.showRoleDefinition(role, log, hideDetails);
        });
      }
    });
  });

  role.command('show [name] [id]')
    .usage('[name] [id]' +
       '\n' +
      '\n           -----    Example 1   -------' +
      '\n           azure role list --name Reader' +
      '\n           Get the Reader role definition.' +
      '\n           -----    Example 2   -------' +
      '\n           azure role list --id Reader' +
      '\n           Get the Reader role definition.' +
      '\n')
    .option('-n --name <name>', $('Name of the role.'))
    .option('--id <id>', $('Id of the Role definition to be deleted'))
    .option('--subscription <subscription>', $('Name or identifier of the subscription to search the role definition in.'))
    .description($('Search for a role definition'))
    .execute(function (name, id, options, _) {

    adUtils.validateParameters({
      id: id,
      name: name
    });

    var subscription = profile.current.getSubscription(options.subscription);
    var client = rbacClients.getAuthzClient(subscription);
    var progress = cli.interaction.progress($('Searching for role definitions'));
    var result = [];
      try {
        if (name) {
          var filterParameters = { roleName: name };
          result = client.roleDefinitions.listWithFilters(filterParameters, _).roleDefinitions;
        }
        else {
          result.push(client.roleDefinitions.get(id, _).roleDefinition);
        }
    } finally {
      progress.end();
    }

    var roles = roleUtils.getRoleDefinitionsWithNormalizedId(result);
    
    cli.interaction.formatOutput(roles, function (data) {
      if (data.length === 0) {
        log.info($('No role definition matching the search criteria was found'));
      } else {
        data.forEach(function (role) {
          roleUtils.showRoleDefinition(role, log);
        });
      }
    });
  });

  role.command('create [inputfile] [roledefinition]')
    .description($('Create a new role definition. The role definition for a new custom role MUST contain the DisplayName, Actions and the AssignableScopes properties. The role definition MAY contain the Description and NotActions property.'))
    .option('-f --inputfile <inputfile>', $('File name containing a single role definition.'))
    .option('-r --roledefinition <roledefinition>', $('A JSON-formatted string containing the role definition. For e.g. {"Name": "Test Role","Description": "Test role","Actions": ["Microsoft.Support/*/read"],"Notactions": [],"AssignableScopes": ["/subscriptions/4004a9fd-d58e-48dc-aeb2-4a4aec58606f"]}'))
    .option('--subscription <subscription>', $('The subscription identifier'))
    .execute(function (inputfile, roledefinition, options, _) {
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
        function (log, _) {
      roleDef = authzClient.roleDefinitions.createOrUpdate(roleDefinitionIdGuid, parameters, _);
    }, _);

    // Normalize role definition id
    roleDef.roleDefinition.id = roleUtils.getRoleDefinitionName(roleDef.roleDefinition.id);
    log.info(doneMessage);

    cli.interaction.formatOutput(roleDef.roleDefinition, function (role) {
      if (role) {
        roleUtils.showRoleDefinition(role, log);
      }
    });
  });

  role.command('set [inputfile] [roledefinition]')
    .description($('Update an existing role definition. The role definition for the updated custom role MUST contain the Id property. The role definition SHOULD contain at least one property that is being updated: DisplayName, Description, Actions, NotActions, AssignableScopes'))
    .option('-f --inputfile <inputfile>', $('File name containing a single role definition to be updated. Only include the properties that are to be updated in the JSON. Id property is Required.'))
    .option('-r --roledefinition <roledefinition>', $('A JSON-formatted string containing the role definition. For e.g. {"Id": "/subscriptions/eb910d4f-edbf-429b-94F6-d76bae7ff401/providers/Microsoft.Authorization/roleDefinitions/52a6cc13-ff92-47a8-a39b-2a8205c3087e","Description": "Updated role","Actions": ["Microsoft.Support/*/read"],"Notactions": [],"AssignableScopes": ["/subscriptions/5004a9fd-d58e-48dc-aeb2-4a4aec58606f"]}'))
    .option('--subscription <subscription>', $('The subscription identifier'))
    .execute(function (inputfile, roledefinition, options, _) {
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
      getResult = authzClient.roleDefinitions.get(inputRole.id, _).roleDefinition;
    } finally {
      progress.end();
    }
    
    if (!getResult) {
      throw new Error(util.format($('Cannot find roledefinition with id: %s'), inputRole.id));
    }
    
    var parameters = roleUtils.constructRoleDefinitionUpdateParameters(cli, inputRole, getResult);
    var roleDefinitionIdGuid = parameters.roleDefinition.name;
    var doneMessage = util.format($('Updated role definition %s'), roleDefinitionIdGuid);
    
    var roleDef = null;
    cli.interaction.withProgress(util.format($('Updating role definition "%s"'), roleDefinitionIdGuid),
        function (log, _) {
      roleDef = authzClient.roleDefinitions.createOrUpdate(roleDefinitionIdGuid, parameters, _);
    }, _);
    
    // Normalize role definition id
    roleDef.roleDefinition.id = roleUtils.getRoleDefinitionName(roleDef.roleDefinition.id);

    log.info(doneMessage);
    cli.interaction.formatOutput(roleDef.roleDefinition, function (role) {
      if (role) {
        roleUtils.showRoleDefinition(role, log);
      }
    });
  });

  role.command('delete [id] [name]')
    .description($('Deletes an existing custom role definition in Azure RBAC. The role definition to delete is provided using the Id property of the role definition.Use list or show roleName to determine the role definition to be deleted.'))
    .option('--id <id>', $('Id of the Role definition to be deleted'))
    .option('-n --name <name>', $('the role definition name'))
    .option('-q --quiet', $('If set, does not prompt for a confirmation before deleting the custom role'))
    .option('--passthru', $('If set, displays the properties of deleted custom role'))
    .option('--subscription <subscription>', $('The subscription identifier'))
    .execute(function (id, name, options, _) {

    adUtils.validateParameters({
      id: id,
      name: name
    });

    var subscription = profile.current.getSubscription(options.subscription);
    var client = rbacClients.getAuthzClient(subscription);
    var role = name ? name : id;

    if (!options.quiet && !cli.interaction.confirm(util.format($('Delete role definition "%s"? [y/n] '), role), _)) {
      return;
    }

    var progress;

    if (id) {
      var roleDefinition = client.roleDefinitions.get(id, _).roleDefinition;

      if (roleDefinition === null) {
        throw new Error(util.format($('Cannot find role definition with id "%s"'), id));
      }
      progress = cli.interaction.progress(util.format($('Deleting role definition with id "%s"'), id));

      // Change id from guid to a fully qualified string
      id = roleDefinition.id;
    }
    else {
      var filterParameters = { roleName: name };
      var roles = client.roleDefinitions.listWithFilters(filterParameters, _).roleDefinitions;

      if (roles.length === 0) {
        throw new Error(util.format($('Cannot find role definition with name "%s"'), name));
      }
      else if (roles.length > 1) {
        throw new Error(util.format($('More than one role definition found with name "%s". Please specify by id.'), name));
      }
      id = roles[0].id;
      progress = cli.interaction.progress(util.format($('Deleting role definition with name "%s"'), name));
    }

    var deleteResult;
    try {
      deleteResult = client.roleDefinitions.deleteMethod(id, _);
    } finally {
      progress.end();
    }

    // Normalize role definition id
    deleteResult.roleDefinition.id = roleUtils.getRoleDefinitionName(deleteResult.roleDefinition.id);

    if (options.passthru && deleteResult.roleDefinition) {
      cli.interaction.formatOutput(deleteResult.roleDefinition, function (data) {
        roleUtils.showRoleDefinition(data, log);
      });
    }
  });
};
