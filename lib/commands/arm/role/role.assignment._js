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
var uuid = require('node-uuid');

var adGraphUtils = require('../../../util/adGraphUtils.js');
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
      var matched = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(principal);
      var principalObjectId;
      if (!matched) {
        var graphUtils = adGraphUtils.adGraphUtilsFactory(subscription);
        principalObjectId = graphUtils.GetADEntityObjectId(principal, _);
      }
      if (!principalObjectId) {
        throw new Error($('Invalid principal.'));
      }

      //Figure out the scope
      if (!scope) {
        scope = constructScope(subscription, resourceGroup, resourceType, resourceName, options.parent);
      }

      var matchedRoles;
      var progress = cli.interaction.progress($('Getting role defintion id'));
      try {
        matchedRoles = client.roleDefinitions.list(_);
        matchedRoles = matchedRoles.roleDefinitions.filter(function (r) {
          return utils.ignoreCaseEquals(r.name, role);
        });
      } finally {
        progress.end();
      }

      var roleId;
      if (matchedRoles && matchedRoles.length > 0) {
        roleId = matchedRoles[0].roleId;
      }
      if (!roleId) {
        throw new Error(util.format($('Role of \'%s\' does not exist'), role));
      }

      var parameter = {
        roleAssignment: {
          appId: '797f4846-ba00-4fd7-ba43-dac1f8f63013',//fixed appid for CSM.
          principalId: principalObjectId,
          roleAssignmentId: uuid.v4(),
          roleId: roleId,
          scope: scope
        }
      };

      progress = cli.interaction.progress($('Creating role assignment'));
      try {
        client.roleAssignments.createOrUpdate(parameter, _);
      } finally {
        progress.end();
      }
    });

  //Bare bone implementation, detail command options will be implemented soon
  roleAssignment.command('list')
    .description($('Lists available role assignments'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getClient(subscription);

      var progress = cli.interaction.progress($('Listing role assignment'));
      var result;
      try {
        result = client.roleAssignments.list(_);
      } finally {
        progress.end();
      }

      if (result.roleAssignments.length === 0) {
        log.info($('No role assignments are found'));
        return;
      }

      //accumulate all user ids
      var principalId = [];
      for (var i = 0; i < result.roleAssignments.length; i++) {
        principalId.push(result.roleAssignments[i].principalId);
      }

      //retrieve user objects from graph and create a mapping between id and principal name
      var graphUtils = adGraphUtils.adGraphUtilsFactory(subscription);
      var entities = graphUtils.getADEntities(principalId, _);
      var principalNames = [];
      for (i = 0; i < entities.length; i++) {
        principalNames[entities[i].objectId] = entities[i].userPrincipalName || entities[i].displayName;
      }

      cli.interaction.formatOutput(result.roleAssignments, function (data) {
        log.table(data, function (row, assignment) {
          row.cell($('Name'), assignment.roleAssignmentId);
          var displayName = principalNames[assignment.principalId];
          if (!displayName) {
            displayName = assignment.principalId;
          }
          row.cell($('PrincipalName'), displayName);
          row.cell($('Role'), assignment.roleId);
          row.cell($('Scope'), assignment.scope);
        });
      });
    });

  //Bare bone implementation, detail command options will be implemented soon
  roleAssignment.command('delete [assignmentId]')
    .description($('delete a role assignment'))
    .option('-a --assignmentId <assignmentId>', $('Assignment Id'))
    .execute(function (assignmentId, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getClient(subscription);

      var progress = cli.interaction.progress($('deleting role assignment'));
      try {
        client.roleAssignments.delete(assignmentId, _);
      } finally {
        progress.end();
      }
    });
};

function constructScope(subscription, resourceGroup, resourceType, resource, resourceParent) {
  var scope = '/subscriptions/' + subscription.id;
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