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
var path = require('path');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-policy-assignment-tests';
var groupName = 'testGroup';
var scope;

describe('arm', function () {
  var suite;

    before(function (done) {
      suite = new CLITest(this, testprefix);
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

  describe('policyAssignment', function () {
    it('create, list, show and delete should work', function (done) {
      var policyDefinitionFile = path.join(__dirname, '../../../data/samplePolicyRule.json');

      suite.execute('policy definition create -n %s -p %s -d %s --json', 'testPolicyDefinition', policyDefinitionFile, 'myPolicy', function (result) {
        result.exitStatus.should.equal(0);
        var policyDefinition = JSON.parse(result.text);
        policyDefinition.name.should.containEql('testPolicyDefinition');
        
        var policyDefinitionId = policyDefinition.id;
        
        suite.execute('group create %s --location %s --json', groupName, 'westus', function (result) {
          result.exitStatus.should.equal(0);
          scope = (JSON.parse(result.text)).id;
          suite.execute('policy assignment create -n %s -p %s -s %s --json', 'testPolicyAssignment', policyDefinitionId, scope, function (result) {
            result.exitStatus.should.equal(0);
            var policyAssignment = JSON.parse(result.text);
            policyAssignment.name.should.containEql('testPolicyAssignment');
            policyAssignment.policyDefinitionId.should.containEql(policyDefinitionId);
            policyAssignment.scope.should.containEql(scope);
            
            suite.execute('policy assignment show -n %s -s %s --json', 'testPolicyAssignment', scope, function (result) {
              result.exitStatus.should.equal(0);
              var policyAssignment = JSON.parse(result.text);
              policyAssignment.name.should.containEql('testPolicyAssignment');
              policyAssignment.policyDefinitionId.should.containEql(policyDefinitionId);
              policyAssignment.scope.should.containEql(scope);
              
              suite.execute('policy assignment set -n %s -s %s -d %s --json', 'testPolicyAssignment', scope, 'myAssignment', function (result) {
                result.exitStatus.should.equal(0);
                var policyAssignment = JSON.parse(result.text);
                policyAssignment.displayName.should.containEql('myAssignment');

                suite.execute('policy assignment list --json', function (result) {
                  result.exitStatus.should.equal(0);
                  var policyAssignments = JSON.parse(result.text);
                  policyAssignments.length.should.be.above(0);
                  
                  suite.execute('policy assignment delete -n %s -s %s -q --json', 'testPolicyAssignment', scope, function (result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});