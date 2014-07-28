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

var policyClientWorkaround = require('./policyClientWorkaround');
var profile = require('../../../util/profile');
var resourceUtils = require('../resource/resourceUtils');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var role = cli.category('role');
  var roleAssignment = role.category('assignment')
      .description($('Commands to manage your role assignment'));

  roleAssignment.command('create [principal] [role] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('create a new role assignment'))
    .option('-p --principal <principal>', $('Principal to assign the role to. Accept the UPN or object id.'))
    .option('-o --role <role>', $('Role to assign the principals with.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to assign the role to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource to assign the role to.'))
    .option('-u --resource-name <resource-name>', $('Name of the resource to assign the role to.'))
    .option('--parent <parent>', $('Parent resource of the resource to assign the role to, if there is any.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment will be created.'))
    .execute(function (principal, role, scope, resourceGroup, resourceType, resourceName, options, _) {
      if (!principal) {
        return cli.missingArgument('principal');
      }
      if (!role) {
        return cli.missingArgument('role');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getClient(subscription);

      //A guid object id? (Supporting UPN is coming soon)
      var principalObjectId = getObjectIdByPrincipalName(principal, subscription, _);
      if (!principalObjectId) {
        throw new Error($('Invalid principal.'));
      }

      //Figure out the scope
      if (!scope) {
        scope = constructScope(subscription, resourceGroup, resourceType, resourceName, options.parent);
      }

      var matchedRoles;
      var progress = cli.interaction.progress($('Getting role definition id'));
      try {
        matchedRoles = client.roleDefinitions.list(_);
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
          principalId: principalObjectId,
          roleDefinitionId: roleId,
          scope: scope
      };

      var roleNameGuid = utils.uuidGen();
      progress = cli.interaction.progress($('Creating role assignment'));
      try {
        client.roleAssignments.create(scope, roleNameGuid, parameter, _);
      } finally {
        progress.end();
      }
    });

  roleAssignment.command('list [principal] [role] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('Get role assignment at a given scope'))
    .option('-p --principal <principal>', $('if not specifed, return role assignments for all the principal.'))
    .option('-o --role <role>', $('Role the principals was assigned to'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to role was assigned to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource the role was assign to'))
    .option('-u --resource-name <resource-name>', $('The resource the role was assigned to.'))
    .option('--parent <parent>', $('Parent resource of the resource the role was assigned to, if there is any.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment is from.'))
    .execute(function (principal, role, scope, resourceGroup, resourceType, resourceName, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getClient(subscription);

      var progress = cli.interaction.progress($('Getting role assignment'));
      var filterResult;
      try {
        filterResult = filterRoleAssignments(subscription, client, principal, role, resourceGroup, resourceType, resourceName, options.parent, scope, _);
      } finally {
        progress.end();
      }

      if (filterResult.assignments.length === 0) {
        log.info($('No macthing role assignments are found'));
        return;
      }

      //retrieve user objects from graph and create a mapping between id and principal name
      var graphClient = policyClientWorkaround.getADGraphClient(subscription);  
      var graphQueryResult = graphClient.objects.getObjectsByObjectIds({ ids: filterResult.principalIdList }, _);
      var entities = graphQueryResult.aADObject;
      var principalNames = [];
      for (var i = 0; i < entities.length; i++) {
        principalNames[entities[i].objectId] = entities[i].userPrincipalName || entities[i].displayName;
      }

      cli.interaction.formatOutput(filterResult.assignments, function (data) {
        log.table(data, function (row, assignment) {
          var displayName = principalNames[assignment.properties.principalId];
          if (!displayName) {
            displayName = assignment.properties.principalId;
          }
          row.cell($('PrincipalName'), displayName);
          row.cell($('Role'), filterResult.roleNames[getRoleGuid(assignment.properties.roleDefinitionId)]);
          row.cell($('Scope'), assignment.properties.scope);
          row.cell($('Permissions'), filterResult.rolePermissionList[getRoleGuid(assignment.properties.roleDefinitionId)]);
        });
      });
    });

  roleAssignment.command('delete [principal] [role] [scope] [resource-group] [resource-type] [resource-name]')
    .description($('delete a role assignment'))
    .option('-p --principal <principal>', $('Principal to remove the role assignment from. Use the UPN or object id.'))
    .option('-o --role <role>', $('Role to remove from the principals.'))
    .option('-c --scope <scope>', $('Scope of the role assignment.'))
    .option('-g --resource-group <resource-group>', $('Resource group to role was assigned to.'))
    .option('-r --resource-type <resource-type>', $('Type of the resource the role was assign to'))
    .option('-u --resource-name <resource-name>', $('The resource the role was assigned to.'))
    .option('--parent <parent>', $('Parent resource of the resource the role was assigned to, if there is any.'))
    .option('-q --quiet', $('If specified, won\'t prompt before delete.'))
    .option('--subscription <subscription>', $('Subscription id or name of where the role assignment will be removed.'))
    .execute(function (principal, role, scope, resourceGroup, resourceType, resourceName, options, _) {
      if (!principal) {
        return cli.missingArgument('principal');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getClient(subscription);

      var progress = cli.interaction.progress($('Getting role assignments to delete'));
      var filterResult;
      try {
        filterResult = filterRoleAssignments(subscription, client, principal, role, resourceGroup, resourceType, resourceName, options.parent, scope, _);
      } finally {
        progress.end();
      }

      if (filterResult.assignments.length > 0) {
        if (!options.quiet && !cli.interaction.confirm($('Delete role assignments? [y/n] '), _)) {
          return;
        }
        progress = cli.interaction.progress($('Deleting role assignments'));
        try {
          for (var i = 0; i <= filterResult.assignments.length - 1; i++) {
            client.roleAssignments.delete(filterResult.assignments[i].properties.scope, filterResult.assignments[i].name, _);
          }
        } finally {
          progress.end();
        }
      }
      else {
        log.info($('No role assignments are found to delete'));
      }
    });
};

function filterRoleAssignments(subscription, client, principal, role, resourceGroup, resourceType, resourceName, parent, scope, _) {
  var filteredAssignments = {
    assignments: []
  };

  if (!scope) {
    scope = constructScope(subscription, resourceGroup, resourceType, resourceName, parent);
  }

  var result;
  result = client.roleAssignments.listForScope(scope, { atScope: true }, _);

  var principalObjectId;
  if (principal) {
    principalObjectId = getObjectIdByPrincipalName(principal, subscription, _);
  }

  if (result.roleAssignments.length === 0) {
    return filteredAssignments;
  }

  //load role permission list
  var rolePermissionList = [];
  var roleNames = [];
  var listRolesResult = client.roleDefinitions.list(_);
  for (i = 0; i < listRolesResult.roleDefinitions.length; i++) {
    var roleId = listRolesResult.roleDefinitions[i].name; //Note, the 'name' field here has guid value
    rolePermissionList[roleId] = serializePermissionList(listRolesResult.roleDefinitions[i].properties.permissions);
    roleNames[roleId] = listRolesResult.roleDefinitions[i].properties.roleName;
  }

  //filtering role assignment.
  var principalIdList = [];
  for (var i = result.roleAssignments.length - 1 ; i >= 0; i--) {
    var roleMatched = !role;
    if (!roleMatched) {
      var roleDefGuid = getRoleGuid(result.roleAssignments[i].properties.roleDefinitionId);
      roleMatched = utils.ignoreCaseEquals(roleNames[roleDefGuid], role);
    }
    var principalMatched = !principalObjectId || utils.ignoreCaseEquals(result.roleAssignments[i].properties.principalId, principalObjectId);
    if (roleMatched && principalMatched) {
      principalIdList.push(result.roleAssignments[i].properties.principalId);
    } else {
      result.roleAssignments.splice(i, 1);
    }
  }

  return {
    assignments: result.roleAssignments,
    roleNames: roleNames, // role textual name (not guid)
    principalIdList: principalIdList,
    rolePermissionList: rolePermissionList
  };
}

function constructScope(subscription, resourceGroup, resourceType, resource, resourceParent) {
  var scope = 'subscriptions/' + subscription.id;
  if (resourceGroup) {
    scope = scope + '/resourcegroups/' + resourceGroup.trim();
    if (resource) {
      if (!resourceType) {
        throw new Error($('Please specify a valid resource type'));
      }
      var resourceTypeName = resourceUtils.getResourceTypeName(resourceType);
      var provider = resourceUtils.getProviderName(resourceType);

      scope = scope + '/providers/' + provider.trim() + '/' + (resourceParent ? resourceParent.trim() : '') +
        '/' + resourceTypeName.trim() + '/' + resource.trim();
    }
  }
  return scope;
}

function getObjectIdByPrincipalName(principal, subscription, _) {
  var matched = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(principal);
  var principalObjectId;
  if (!matched) {
    var graphClient = policyClientWorkaround.getADGraphClient(subscription);
    var graphQueryResult = graphClient.user.get(principal, _);
    var user = graphQueryResult.user;
    principalObjectId = user.objectId;
  }
  return principalObjectId;
}

function serializePermissionList(permissions) {
  var actions = [];
  for (var i = 0; i < permissions.length; i++) {
    actions = actions.concat(permissions[i].actions);
  }
  return actions.join();
}

function getRoleGuid(roleDefId) {
  //to extract out the <guid> from definition id like '/subscriptions/358f3860-9dbe-4ace-b0c0-3d4f2d861014/providers/.../<guid>'
  return roleDefId.substring(roleDefId.lastIndexOf('/') + 1);
}
