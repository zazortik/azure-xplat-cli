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
var testprefix = 'arm-cli-policy-definition-tests';

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

  describe('policyDefinition', function () {
    it('create, list, show and delete should work with file', function (done) {
      var policyDefinitionFile = path.join(__dirname, '../../../data/samplePolicyRule.json');

      suite.execute('policy definition create -n %s -p %s -d %s --json', 'testPolicyDefinition', policyDefinitionFile, 'myPolicy', function (result) {
        result.exitStatus.should.equal(0);
        var policyDefinition = JSON.parse(result.text);
        policyDefinition.name.should.containEql('testPolicyDefinition');

        suite.execute('policy definition show %s --json', 'testPolicyDefinition', function (result) {
          result.exitStatus.should.equal(0);
          var policyDefinition = JSON.parse(result.text);
          policyDefinition.name.should.containEql('testPolicyDefinition');
          policyDefinition.displayName.should.containEql('myPolicy');
          policyDefinition.id.indexOf('testPolicyDefinition').should.be.above(-1);
          
          suite.execute('policy definition set -n %s -d %s --json', 'testPolicyDefinition', 'myNewPolicy', function (result) {
            result.exitStatus.should.equal(0);
            var policyDefinition = JSON.parse(result.text);
            policyDefinition.displayName.should.containEql('myNewPolicy');

            suite.execute('policy definition list --json', function (result) {
              result.exitStatus.should.equal(0);
              var policyDefinitions = JSON.parse(result.text);
              policyDefinitions.length.should.be.above(0);
              
              suite.execute('policy definition delete %s -q --json', 'testPolicyDefinition', function (result) {
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