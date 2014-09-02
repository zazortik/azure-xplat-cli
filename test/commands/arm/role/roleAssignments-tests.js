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

var should = require('should');
var sinon = require('sinon');
require('streamline').register();

var RoleAssignments = require('../../../../lib/commands/arm/role/roleAssignments._js');

describe('role assignments', function () {
  it('should invoke authorization client with right parameter when use scope', function () {
    //setup
    var authzClient = {
      roleAssignments: { listForScope: function (arScope, parameter, callback) { } },
      roleDefinitions: { list: function (callback) { callback(null, { roleDefinitions: [] }); }}
    };
    sinon.stub(authzClient.roleAssignments, 'listForScope').callsArgWith(2/*3th parameter of 'listForScope' is the callback*/, 
        null/*no error*/, { roleAssignments: [] });
    var roleAssignments = new RoleAssignments(authzClient);
    var sampleScope = '/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourceGroups/xDeploy';
    
    //action
    roleAssignments.query(false, '', { scope: sampleScope }, '', function () { });
    
    //assert
    var scopeArg = authzClient.roleAssignments.listForScope.firstCall.args[0];
    var param = authzClient.roleAssignments.listForScope.firstCall.args[1];
    
    scopeArg.should.equal(sampleScope);
    param.atScope.should.be.true;
    param.principalId.should.equal('');
  });

  it('should show object id if the principal id can\'t be resolved', function (done) {
    //setup
    var samplePrincipalId = 'f09fea55-4947-484b-9b25-c67ddd8795ac';

    var sampleRoleAssignments = [{
      id: '/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourcegroups/somegroup/providers/Microsoft.Authorization/roleAssignments/6e13f985-87e4-4f00-afda-c46856a4270a',
      name: '6e13f985-87e4-4f00-afda-c46856a4270a',
      type: 'Microsoft.Authorization/roleAssignments',
      properties: {
        roleDefinitionId: '/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/providers/Microsoft.Authorization/roleDefinitions/acdd72a7-3385-48ef-bd42-f606fba81ae7',
        principalId: samplePrincipalId,
        scope: '/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourcegroups/adminonly',
        roleName: 'Reader',
      }
    }];
    var authzClient = {
      roleAssignments: {
        listForScope: function (arScope, parameter, callback) { callback(null, { roleAssignments: sampleRoleAssignments }); }
      },
      roleDefinitions: { list: function (callback) { callback(null, { roleDefinitions: [] }); } }
    };
    var graphClient = {
      objects: { getObjectsByObjectIds: function (objectIds, callback) { callback(null, { aADObject: [] }); }}
    };

    var roleAssignments = new RoleAssignments(authzClient, graphClient);
    var sampleScope = '/subscriptions/2d006e8c-61e7-4cd2-8804-b4177a4341a1/resourceGroups/somegroup';
    
    //action
    roleAssignments.query(true, '', { scope: sampleScope }, '', function (error, assignments) {
      //assert
      assignments[0].properties.principalName.should.equal(samplePrincipalId);
      done();
    });
  });

});