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
var testprefix = 'arm-cli-ad-tests';

var requiredEnvironment = [
  'AZURE_AD_TEST_GROUP_NAME',//testGroup1
  'AZURE_AD_TEST_SUBGROUP_NAME',//testGroup2(must be a member of tetsGroup1)
  'AZURE_AD_TEST_USER_NAME',//testUser1
  'AZURE_AD_TEST_USER_PRINCIPAL_NAME', // testUser1@aad105.ccsctp.net(must be a member of testGroup1, but not of testGroup2)
  'AZURE_AD_TEST_USER_PRINCIPAL_NAME2' //testUser2@aad105.ccsctp.net
];

function getTestGroupName() { return process.env.AZURE_AD_TEST_GROUP_NAME; }
function getTestSubGroupName() { return process.env.AZURE_AD_TEST_SUBGROUP_NAME; }
function getTestUserName() { return process.env.AZURE_AD_TEST_USER_NAME; }
function getTestUPN() { return process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME; }
function getTestUPN2() { return process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME2; }

describe('arm', function () {
  describe('ad', function () {
    var suite;
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
    
    
    describe('Users', function () {
      var upn = getTestUPN();
      var upn2 = getTestUPN2();
      it('should work to list and show users', function (done) {
        suite.execute('ad user list --json', function (result) {
          result.exitStatus.should.equal(0);
          var text = result.text;
          var seemsCorrect = (text.indexOf(upn) !== -1) && (text.indexOf(upn2) !== -1);
          seemsCorrect.should.equal(true);
          suite.execute('ad user show %s --json', upn, function (result) {
            result.exitStatus.should.equal(0);
            text = result.text;
            seemsCorrect = (text.indexOf(upn) !== -1) && (text.indexOf(upn2) === -1);
            seemsCorrect.should.equal(true);
            done();
          });
        });
      });
    });
    
    describe('Groups', function () {
      it('should work to list and show groups', function (done) {
        var group1 = getTestGroupName();
        var group2 = getTestSubGroupName();
        var member1 = getTestUPN();
        suite.execute('ad group list --json', function (result) {
          result.exitStatus.should.equal(0);
          var text = result.text;
          var seemsCorrect = (text.indexOf(group1) !== -1) && (text.indexOf(group2) !== -1);
          seemsCorrect.should.equal(true);
          suite.execute('ad group get %s --json', group1, function (result) {
            result.exitStatus.should.equal(0);
            text = result.text;
            seemsCorrect = (text.indexOf(group1) !== -1) && (text.indexOf(group2) === -1);
            seemsCorrect.should.equal(true);
            suite.execute('ad group get -p %s --json', member1, function (result) {
              result.exitStatus.should.equal(0);
              text = result.text;
              seemsCorrect = (text.indexOf(group1) !== -1) && (text.indexOf(group2) === -1);
              seemsCorrect.should.equal(true);
              suite.execute('ad group members %s --json', group1, function (result) {
                result.exitStatus.should.equal(0);
                text = result.text;
                seemsCorrect = (text.indexOf(group2) !== -1) && (text.indexOf(member1) !== -1);
                seemsCorrect.should.equal(true);
                done();
              });
            });
          });
        });
      });
    });
  });
});