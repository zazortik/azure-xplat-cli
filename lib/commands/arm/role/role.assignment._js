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

var request = require('request');
var uuid = require('node-uuid');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var role = cli.category('role');
  var roleAssignment = role.category('assignment')
      .description($('Commands to manage your role assignment'));

  roleAssignment.command('create')
    .description($('create a new role assignment'))
    .execute(function (options, _) {
      var dummyScope = '/sub/123';
      var principal = 'yugangw@microsoft.com';
      var roleName = 'Operator';
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createPolicyManagementClient');

      var userObjectId = getUserObjectId(principal, subscription, _);

      var progress = cli.interaction.progress($('Creating role assignment'));
      var result;

      var assignmentId = uuid.v4();//.replace(/-/g, '');
      var parameter = {
        roleAssignment: {
          //appId: '797f4846-ba00-4fd7-ba43-dac1f8f63013', //CSM app, fixed id
          //principalId: userObjectId, //object id such as johnDoe@microsoft.com
          //principalType: 'User',
          //roleAssignmentId: assignmentId,
          //roleId: '43137be5-c198-403e-8b8e-cfcb933bf291',//"Write"(from https://aad-pas-nova-by1-001.cloudapp.net/1EEEB395-21C8-4AE0-B145-2ABD2DFE501D)
          //scope: dummyScope

          roleAssignmentId : "558b5d41-ca73-424a-ac84-8c34f5873811",
          appId: "80941f63-e69b-4695-ba71-3f8028ca1e5f",
          roleId: "7af85c43-6fb7-49f9-9ff6-f9ff20d7205c",
          principalId: "12edb772-da3a-4647-bff1-8b66f48c33bb",
          scope: "/sub/123",
          principalType: "User"
        }
      };

      try {
        result = client.roleAssignments.createOrUpdate(parameter, _);
      } finally {
        progress.end();
      }
    });

  roleAssignment.command('list')
    .description($('Lists the available role assignment'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createPolicyManagementClient');
      var progress = cli.interaction.progress($('Listing role assignment'));
      var result;
      try {
        result = client.roleAssignments.list(_);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result.roleAssignments, function (data) {
        if (data.length === 0) {
          log.info($('No role definition defined'));
        } else {
          log.table(data, function (row, assignment) {
            row.cell($('Name'), assignment.roleAssignmentId);
            row.cell($('Role'), assignment.roleId);
            row.cell($('PrincipalType'), assignment.principalType);
            row.cell($('Scope'), assignment.scope);
          });
        }
      });
    });
};

function getUserObjectId(user, subscription, _) {
  var cred = subscription._createCredentials();
  var token = cred.accessToken.getRawToken(_);
  /*cred.accessToken.authConfig.tenantId*/
  var response = getUserProfile(token, '72f988bf-86f1-41af-91ab-2d7cd011db47', user, _);
  var allProperties = JSON.parse(response);
  var objectId = allProperties['objectId'];
  console.log(objectId);
  return objectId;
}

function getUserProfile(token, tenantId, principalName, callback) {
  var baseGraphUrl = 'https://graph.windows.net/' + tenantId + '/';
  var userSubQueryUrl;
  if (principalName){
    userSubQueryUrl = 'users/' + principalName;
  } else {
    userSubQueryUrl = 'me';
  }
  var graphProfileUrl = baseGraphUrl + userSubQueryUrl + '?api-version=2013-11-08';

  var options = {
    url: graphProfileUrl,
    headers: {
      Authorization: 'Bearer ' + token
    }
  };

  request(options, function (error, response, body) {
    if (error) {
      console.log(response);
      return callback(new Error(error));
    }
    return callback(null, body);
  });
}