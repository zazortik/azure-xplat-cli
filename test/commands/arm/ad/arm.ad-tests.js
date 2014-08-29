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
  { name: 'AZURE_AD_TEST_GROUP_NAME', defaultValue: 'testgroup1' },
  { name: 'AZURE_AD_TEST_GROUP_OBJECT_ID', defaultValue: '08b96007-f08c-4344-8fe0-3b59dd6a8464' },
  { name: 'AZURE_AD_TEST_SUBGROUP_NAME', defaultValue: 'testgroup2' }, //(must be a member of testgroup1)
  { name: 'AZURE_AD_TEST_USER_OBJECT_ID', defaultValue: 'f09fea55-4947-484b-9b25-c67ddd8795ac' },
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME', defaultValue: 'testUser1@aad105.ccsctp.net' }, //(must be a member of testGroup1, but not of testGroup2)
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME2', defaultValue: 'testUser2@aad105.ccsctp.net'}
];

function getTestGroupName() { return process.env.AZURE_AD_TEST_GROUP_NAME; }
function getTestGroupObjectId() { return process.env.AZURE_AD_TEST_GROUP_OBJECT_ID; }
function getTestSubGroupName() { return process.env.AZURE_AD_TEST_SUBGROUP_NAME; }
function getTestUserObjectId() { return process.env.AZURE_AD_TEST_USER_OBJECT_ID; }
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
      it('should work to list and show users', function (done) {
        var upn = getTestUPN();
        var upn2 = getTestUPN2();
        suite.execute('ad user list --json', function (result) {
          result.exitStatus.should.equal(0);
          var text = result.text;
          var seemsCorrect = (text.indexOf(upn) !== -1) && (text.indexOf(upn2) !== -1);
          seemsCorrect.should.equal(true);
          suite.execute('ad user show --upn %s --json', upn, function (result) {
            result.exitStatus.should.equal(0);
            text = result.text;
            seemsCorrect = (text.indexOf(upn) !== -1) && (text.indexOf(upn2) === -1);
            seemsCorrect.should.equal(true);
            done();
          });
        });
      });

      it('should parse the error properly for a non existant user', function (done) {
        suite.execute('ad user show --upn %s --json', 'nonexisitinguser@mywebforum.com', function (result) {
          result.text.should.equal('{}\n');
          done();
        });
      });
    });
    
    describe('Groups', function () {
      it('should work to list and show groups', function (done) {
        var group1 = getTestGroupName();
        var group1ObjectId = getTestGroupObjectId();
        var group2 = getTestSubGroupName();
        var member1 = getTestUPN();
        var memberObjectId = getTestUserObjectId();
        suite.execute('ad group list --json', function (result) {
          result.exitStatus.should.equal(0);
          var text = result.text;
          var seemsCorrect = (text.indexOf(group1) !== -1) && (text.indexOf(group2) !== -1);
          seemsCorrect.should.equal(true);
          suite.execute('ad group show --search %s --json', group1, function (result) {
            result.exitStatus.should.equal(0);
            text = result.text;
            seemsCorrect = (text.indexOf(group1) !== -1) && (text.indexOf(group2) === -1);
            seemsCorrect.should.equal(true);
            suite.execute('ad group list --objectId %s --json', memberObjectId, function (result) {
              result.exitStatus.should.equal(0);
              text = result.text;
              seemsCorrect = (text.indexOf(group1) !== -1) && (text.indexOf(group2) === -1);
              seemsCorrect.should.equal(true);
              suite.execute('ad group member list --objectId %s --json', group1ObjectId, function (result) {
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