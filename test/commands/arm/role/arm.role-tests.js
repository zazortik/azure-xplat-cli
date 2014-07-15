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

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-role-tests';

var requiredEnvironment = [
  'AZURE_AD_TEST_PRINCIPAL_NAME', //admin@aad240.ccsctp.net
  'AZURE_AD_TEST_PRINCIPAL_ID'//d4cabc17-0ae7-4855-8bec-89797db15fb0
];

function getTestPrincipalName() { return process.env.AZURE_AD_TEST_PRINCIPAL_NAME };
function getTestPrincipalId() { return process.env.AZURE_AD_TEST_PRINCIPAL_ID };

describe('arm', function () {
  describe('role', function () {
    var suite;
    var TEST_ROLE_NAME = 'Operator';
    var GUID_REGEXP = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    before(function (done) {
      suite = new CLITest(testprefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('list all built-in roles', function () {
      it('should work', function (done) {
        suite.execute('role list --json', function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.name === 'Operator';
          }).should.be.true;
          done();
        });
      });
    });

    describe('show a built-in role of Operator', function () {
      it('should work', function (done) {
        suite.execute('role show Operator --json', function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.name === 'Operator';
          }).should.be.true;
          done();
        });
      });
    });

    describe('create a role assignment under subscripton', function () {
      it('should work', function (done) {
        var principalId = getTestPrincipalId();
        var principal = getTestPrincipalName();
        suite.execute('role assignment create -p %s -o %s --json', principal, TEST_ROLE_NAME, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list -p %s -o %s --json', principal, TEST_ROLE_NAME, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;

            //clean up
            suite.execute('role assignment delete -p %s -o %s -q --json', principal, TEST_ROLE_NAME, function (result) {
              done();
            });
          });
        });
      });
    });

    describe('create a role assignment under resource group', function () {
      it('should work', function (done) {
        var principalId = getTestPrincipalId();
        var principal = getTestPrincipalName();
        var resourceGroup = 'rg1';
        var expectedScopeFragment = '/resourcegroups/rg1';
        suite.execute('role assignment create -p %s -o %s -g %s --json', principal, TEST_ROLE_NAME, resourceGroup, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list -p %s -o %s -g %s --json', principal, TEST_ROLE_NAME, resourceGroup, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + resourceGroup + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;

            //clean up
            suite.execute('role assignment delete -p %s -o %s -g %s -q --json', principal, TEST_ROLE_NAME, resourceGroup, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
    });
  });
});