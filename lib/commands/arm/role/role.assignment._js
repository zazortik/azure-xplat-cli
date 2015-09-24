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

var adUtils = require('../ad/adUtils');
var rbacClients = require('./rbacClients');
var profile = require('../../../util/profile');
var RoleAssignments = require('./roleAssignments');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var role = cli.category('role');
  var roleAssignment = role.category('assignment')
      .description($('Commands to manage your role assignment'));

  roleAssignment.command('create [objectId] [signInName] [spn] [roleName] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('create a new role assignment'))
    .option('--objectId <objectId>', $('Object id of an active directory user, group or service principal.'))
    .option('--signInName <signInName>', $('Sign-in name of a User.'))
    .option('--spn <spn>', $('Service Principal Name.'))
    .option('-o --roleName <roleName>', $('Role name that the principal is assigned to.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to assign the role to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource to assign the role to.'))
    .option('-u --resource-name <resource-name>', $('Name of the resource to assign the role to.'))
    .option('--parent <parent>', $('Parent resource of the resource to assign the role to, if there is any.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment will be created.'))
    .execute(function (objectId, signInName, spn, roleName, scope, resourceGroup, resourceType, resourceName, options, _) {
      if (!roleName) {
        return cli.missingArgument('roleName');
    }
    adUtils.validateParameters({
      objectId: objectId,
      signInName: signInName,
      spn: spn
    });
    
    var subscription = profile.current.getSubscription(options.subscription);
    var authzClient = rbacClients.getAuthzClient(subscription);
    var graphClient = adUtils.getADGraphClient(subscription);
    var helper = new RoleAssignments(authzClient, graphClient);

    scope = RoleAssignments.buildScopeString({
      scope: scope,
      subscriptionId: subscription.id, 
      resourceGroup: resourceGroup,
      resourceType: resourceType, 
      resourceName: resourceName,
      parent: options.parent
    });

    var objectType = {};
    objectId = adUtils.getObjectId(
      {
        objectId: objectId,
        signInName: signInName,
        spn: spn
      }, graphClient, true, false, objectType, _);
    
    var matchedRoles;
    var progress = cli.interaction.progress($('Getting role definition id'));
    try {
      matchedRoles = authzClient.roleDefinitions.list(_);
      matchedRoles = matchedRoles.roleDefinitions.filter(function (r) {
        return utils.ignoreCaseEquals(r.properties.roleName, roleName);
      });
    } finally {
      progress.end();
    }
    
    var roleId;
    if (matchedRoles && matchedRoles.length > 0) {
      roleId = matchedRoles[0].id;
    }
    if (!roleId) {
      throw new Error(util.format($('Role of \'%s\' does not exist'), role));
    }

    var parameter = {
      properties: {
        principalId: objectId,
        roleDefinitionId: roleId,
        scope: scope
      }
    };

    var roleAssignmentNameGuid = utils.uuidGen();
    progress = cli.interaction.progress($('Creating role assignment'));
    var createdAssignment = null;
    try {
      createdAssignment = authzClient.roleAssignments.create(scope, roleAssignmentNameGuid, parameter, _);
    } finally {
      if (createdAssignment) {
        var assignmentToDisplay = helper.fillRoleAndPrincipalDetailsForAssignment(createdAssignment.roleAssignment, _);
        if (assignmentToDisplay && assignmentToDisplay.length > 0) {
          showRoleAssignment(assignmentToDisplay[0]);
        }
      }
      progress.end();
    }
  });

  roleAssignment.command('list [objectId] [signInName] [spn] [roleName] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('Get role assignment at a given scope'))
    .option('--objectId <objectId>', $('Object id of an active directory user, group or service principal.'))
    .option('--signInName <signInName>', $('Sign-in name of a User.'))
    .option('--spn <spn>', $('Service Principal Name.'))
    .option('-o --roleName <roleName>', $('Role name that the principal is assigned to.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to role was assigned to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource the role was assign to'))
    .option('-u --resource-name <resource-name>', $('The resource the role was assigned to.'))
    .option('--parent <parent>', $('Parent resource of the resource the role was assigned to, if there is any.'))
    .option('-e --expandPrincipalGroups', $('If specified, returns role assignments directly assigned to the principal as well as assignments to the principal\'s groups (transitive). Supported only for User Principals.'))
    .option('-a --includeClassicAdministrators', $('If specified, also returns the subscription classic administrators as role assignments.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment is from.'))
    .execute(function (objectId, signInName, spn, roleName, scope, resourceGroup, resourceType, resourceName, options, _) {

      adUtils.validateParameters({
        objectId: objectId,
        signInName: signInName,
        spn: spn
      }, false);

      var subscription = profile.current.getSubscription(options.subscription);
      var authzClient = rbacClients.getAuthzClient(subscription);
      var graphClient = adUtils.getADGraphClient(subscription);

      var progress = cli.interaction.progress($('Getting role assignment'));
      var assignmentCollection = new RoleAssignments(authzClient, graphClient);
      var subscriptionIdForScope;

      if (resourceGroup) {
        subscriptionIdForScope = subscription.id;
      }

      var scopeString = RoleAssignments.buildScopeString({
        scope: scope,
        resourceGroup: resourceGroup,
        resourceType: resourceType,
        resourceName: resourceName,
        parent: options.parent,
        subscriptionId: subscriptionIdForScope
      });

      var assignments;

      var expandGroups = false;
      if (options.expandPrincipalGroups) {
        expandGroups = true;
      }
      var includeAdmins = false;
      if (options.includeClassicAdministrators) {
        includeAdmins = true;
      }

      var principalParameters = {
        objectId: objectId,
        signInName: signInName
      };

      if (!assignmentCollection.optionIsSet(principalParameters) && expandGroups) {
        var parameterNames = Object.keys(principalParameters);
        throw new Error(util.format(('Please provide a value to one of the parameters \'%s\' for using option \'-e\' or \'expandPrincipalGroups\''), parameterNames.join()));
      }

      try {
        assignments = assignmentCollection.query(true,
          {
            objectId: objectId,
            signInName: signInName,
            spn: spn
          },
          scopeString, roleName, expandGroups, includeAdmins, cli, subscription, _);

      } finally {
        progress.end();
      }

      if (assignments.length === 0) {
        log.info($('No matching role assignments were found'));
        return;
      }
      
      cli.interaction.formatOutput(assignments, function (outputData) {
        for (var i = 0; i < outputData.length; i++) { 
          showRoleAssignment(outputData[i]);
        }        
      });
    });

  roleAssignment.command('delete [objectId] [signInName] [spn] [roleName] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('delete a role assignment'))
    .option('--objectId <objectId>', $('Object id of an active directory user, group or service principal'))
    .option('--signInName <signInName>', $('Sign-in name of a user.'))
    .option('--spn <spn>', $('Service Principal Name.'))
    .option('-o --roleName <roleName>', $('Role name that the principal is assigned to.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group the role is assigned to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource the role is assigned to'))
    .option('-u --resource-name <resource-name>', $('The resource the role is assigned to.'))
    .option('--parent <parent>', $('Parent resource of the resource the role is assigned to, if there is any.'))
    .option('-q --quiet', $('If specified, won\'t prompt before delete.'))
    .option('--passthru', $('If set, displays the properties of deleted role assignment'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment will be removed.'))
    .execute(function (objectId, signInName, spn, roleName, scope, resourceGroup, resourceType, resourceName, options, _) {

      var principal = {
        objectId: objectId,
        signInName: signInName,
        spn: spn
      };

      adUtils.validateParameters(principal);

      if (!roleName) {
        return cli.missingArgument('roleName');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var authzClient = rbacClients.getAuthzClient(subscription);
      var graphClient = adUtils.getADGraphClient(subscription);
      var assignmentCollection = new RoleAssignments(authzClient, graphClient);
      var progress;

      var scopeString = RoleAssignments.buildScopeString({
        scope: scope,
        resourceGroup: resourceGroup,
        resourceType: resourceType,
        resourceName: resourceName,
        parent: options.parent,
        subscriptionId: subscription.id
      });

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete role assignment for AD object "%s" on scope "%s" with role definition "%s"? [y/n] '),
          assignmentCollection.activeFilterADObject(principal), scopeString, roleName), _)) {
        return;
      }

      var assignments = assignmentCollection.query(false, principal, scopeString, roleName, false, false, cli, subscription, _);

      if (assignments.length > 0) {
        progress = cli.interaction.progress($('Deleting role assignment'));

        try {
          authzClient.roleAssignments.deleteById(assignments[0].id, _);
        } finally {
          progress.end();
        }

        if (options.passthru) {
          cli.interaction.formatOutput(assignments[0], function (assignment) {
            showRoleAssignment(assignment);
          });
        }
      }
      else {
        throw new Error($('The provided information does not map to a role assignment'));
      }
    });

  function showRoleAssignment(roleAssignment) {
    log.data($('RoleAssignmentId     :'), roleAssignment.id);
    log.data($('RoleDefinitionName   :'), roleAssignment.properties.roleName);
    log.data($('RoleDefinitionId     :'), roleAssignment.properties.roleDefinitionId);
    log.data($('Scope                :'), roleAssignment.properties.scope);
    log.data($('Display Name         :'), roleAssignment.properties.aADObject.displayName);
    log.data($('SignInName           :'), roleAssignment.properties.aADObject.signInName);
    log.data($('ObjectId             :'), roleAssignment.properties.aADObject.objectId);
    log.data($('ObjectType           :'), roleAssignment.properties.aADObject.objectType);
    
    log.data('');
  }
};