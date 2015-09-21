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

  roleAssignment.command('create [objectId] [upn] [mail] [spn] [role] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('create a new role assignment'))
    .option('--objectId <objectId>', $('Object id of an active directory user, group or service principal.'))
    .option('--upn <upn>', $('User principal name.'))
    .option('--mail <mail>', $('Mail of a user or group.'))
    .option('--spn <spn>', $('Service Principal Name.'))
    .option('-o --role <role>', $('Role to assign the principals with.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to assign the role to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource to assign the role to.'))
    .option('-u --resource-name <resource-name>', $('Name of the resource to assign the role to.'))
    .option('--parent <parent>', $('Parent resource of the resource to assign the role to, if there is any.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment will be created.'))
    .execute(function (objectId, upn, mail, spn, role, scope, resourceGroup, resourceType, resourceName, options, _) {
    if (!role) {
      return cli.missingArgument('role');
    }
    adUtils.validateParameters({
      objectId: objectId,
      upn: upn,
      mail: mail,
      spn: spn
    });
    
    var subscription = profile.current.getSubscription(options.subscription);
    var authzClient = rbacClients.getAuthzClient(subscription);
    var graphClient = adUtils.getADGraphClient(subscription);
    
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
        upn: upn,
        mail: mail,
        spn: spn
      }, graphClient, true, objectType, _);
    
    var matchedRoles;
    var progress = cli.interaction.progress($('Getting role definition id'));
    try {
      matchedRoles = authzClient.roleDefinitions.list(_);
      matchedRoles = matchedRoles.roleDefinitions.filter(function (r) {
        return utils.ignoreCaseEquals(r.properties.roleName, role);
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
    try {
      authzClient.roleAssignments.create(scope, roleAssignmentNameGuid, parameter, _);
    } finally {
      progress.end();
    }
  });

  roleAssignment.command('list [objectId] [upn] [mail] [spn] [role] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('Get role assignment at a given scope'))
    .option('--objectId <objectId>', $('Object id of an active directory user, group or service principal.'))
    .option('--upn <upn>', $('User principal name.'))
    .option('--mail <mail>', $('Mail of a user or group.'))
    .option('--spn <spn>', $('Service Principal Name.'))
    .option('-o --role <role>', $('Role the principals was assigned to'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to role was assigned to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource the role was assign to'))
    .option('-u --resource-name <resource-name>', $('The resource the role was assigned to.'))
    .option('--parent <parent>', $('Parent resource of the resource the role was assigned to, if there is any.'))
    .option('-e --expandPrincipalGroups', $('If specified, returns role assignments directly assigned to the principal as well as assignments to the principal\'s groups (transitive). Supported only for User Principals.'))
    .option('-a --includeClassicAdministrators', $('If specified, also returns the subscription classic administrators as role assignments.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment is from.'))
    .execute(function (objectId, upn, mail, spn, role, scope, resourceGroup, resourceType, resourceName, options, _) {

      adUtils.validateParameters({
        objectId: objectId,
        upn: upn,
        mail: mail,
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
        upn: upn,
        mail: mail
      };

      if (!assignmentCollection.optionIsSet(principalParameters) && expandGroups) {
        var parameterNames = Object.keys(principalParameters);
        throw new Error(util.format(('Please provide a value to one of the parameters \'%s\' for using option \'-e\' or \'expandPrincipalGroups\''), parameterNames.join()));
      }

      try {
        assignments = assignmentCollection.query(true,
          {
            objectId: objectId,
            upn: upn,
            mail: mail,
            spn: spn
          },
          scopeString, role, expandGroups, includeAdmins, cli, subscription, _);

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

  roleAssignment.command('delete [objectId] [upn] [mail] [spn] [role] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('delete a role assignment'))
    .option('--objectId <objectId>', $('Object id of an active directory user, group or service principal'))
    .option('--upn <upn>', $('User principal name.'))
    .option('--mail <mail>', $('Mail of a user or group.'))
    .option('--spn <spn>', $('Service Principal Name.'))
    .option('-o --role <role>', $('Role to remove from the principals.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to role was assigned to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource the role was assign to'))
    .option('-u --resource-name <resource-name>', $('The resource the role was assigned to.'))
    .option('--parent <parent>', $('Parent resource of the resource the role was assigned to, if there is any.'))
    .option('-q --quiet', $('If specified, won\'t prompt before delete.'))
    .option('--passthru', $('If set, displays the properties of deleted role assignment'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment will be removed.'))
    .execute(function (objectId, upn, mail, spn, role, scope, resourceGroup, resourceType, resourceName, options, _) {

      var principal = {
        objectId: objectId,
        upn: upn,
        mail: mail,
        spn: spn
      };

      adUtils.validateParameters(principal);

      if (!role) {
        return cli.missingArgument('role');
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
          assignmentCollection.activeFilterADObject(principal), scopeString, role), _)) {
        return;
      }

      var assignments = assignmentCollection.query(false, principal, scopeString, role, false, false, cli, subscription, _);

      if (assignments.length > 0) {
        progress = cli.interaction.progress($('Deleting role assignments'));

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
    log.data($('RoleAssignmentId     :'), roleAssignment.name);
    log.data($('Actions              : ') + roleAssignment.properties.actions);
    log.data($('NotActions           : ') + roleAssignment.properties.notActions);
    log.data($('RoleDefinitionName   :'), roleAssignment.properties.roleName);
    log.data($('Scope                :'), roleAssignment.properties.scope);
    log.data($('Display Name         :'), roleAssignment.properties.aADObject.displayName);
    log.data($('ObjectId             :'), roleAssignment.properties.aADObject.objectId);

    var objectType = roleAssignment.properties.aADObject.objectType;
    log.data($('ObjectType           :'), objectType);
    if (utils.ignoreCaseEquals(objectType, 'user')) {
      log.data($('UserPrincipalName    :'), roleAssignment.properties.aADObject.userPrincipalName);
      log.data($('Mail                 :'), roleAssignment.properties.aADObject.signInName);
    } else if (utils.ignoreCaseEquals(objectType, 'group')) {
      log.data($('Mail                 :'), roleAssignment.properties.aADObject.mail);
    } else if (utils.ignoreCaseEquals(objectType, 'serviceprincipal')) {
      var spn;
      if (roleAssignment.properties.aADObject.servicePrincipalNames) {
        spn = roleAssignment.properties.aADObject.servicePrincipalNames[0];
      } else {
        spn = '';
      }

      log.data($('ServicePrincipalName :'), spn);
    }

    log.data('');
  }
};