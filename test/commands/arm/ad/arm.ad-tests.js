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
var graphUtil = require('../../../util/graphUtils');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-ad-tests';
var util = require('util');
var AD_USER = 'user';
var AD_GROUP = 'group';

var requiredEnvironment = [
  { name: 'AZURE_AD_TEST_PASSWORD' },
  { name: 'AZURE_AD_TEST_GROUP_NAME', defaultValue: 'testgroup1' },
  { name: 'AZURE_AD_TEST_SUBGROUP_NAME', defaultValue: 'testgroup2' },
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME', defaultValue: 'testUser1@rbactest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME2', defaultValue: 'testUser2@rbactest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_SP_DISPLAY_NAME', defaultValue: 'rbacApp' },
  { name: 'AZURE_AD_TEST_SP_NAME', defaultValue: '59253046-1d78-4775-adfd-e0e341daee22' },
  { name: 'AZURE_AD_TEST_SP_OBJECT_ID', defaultValue: '1ba98b33-f85f-4d78-9938-8c117a5d0bbc' }
];

function getTestGroupName() { return process.env.AZURE_AD_TEST_GROUP_NAME; }
function getTestGroupObjectId() { return graphUtil.getGroupObjectId(process.env.AZURE_AD_TEST_GROUP_NAME); }
function getTestSubGroupName() { return process.env.AZURE_AD_TEST_SUBGROUP_NAME; }
function getTestUserObjectId() { return graphUtil.getUserObjectId(process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME); }
function getTestUPN() { return process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME; }
function getTestUPN2() { return process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME2; }
function getTestPwd() { return process.env.AZURE_AD_TEST_PASSWORD; }

describe('arm', function () {
  describe('ad', function () {
    var suite;
    before(function (done) {
      suite = new CLITest(testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        graphUtil.createGroup(getTestGroupName(), function (err, result) {
          graphUtil.createGroup(getTestSubGroupName(), function (err, result) {
            graphUtil.createUser(getTestUPN(), getTestPwd(), function (err, result) {
              graphUtil.createUser(getTestUPN2(), getTestPwd(), function (err, result) {
                //(testUser1 must be a member of testGroup1, but not of testGroup2)
                graphUtil.addGroupMember(getTestGroupName(), getTestUPN(), AD_USER, function (err, result) {
                  //(testgroup2 must be a member of testgroup1)
                  graphUtil.addGroupMember(getTestGroupName(), getTestSubGroupName(), AD_GROUP, function (err, result) {
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    
    after(function (done) {
      suite.teardownSuite(function () {
        graphUtil.removeMember(getTestGroupName(), getTestUPN(), AD_USER, function (err, result) {
          graphUtil.removeMember(getTestGroupName(), getTestSubGroupName(), AD_GROUP, function (err, result) {
            graphUtil.deleteGroup(getTestGroupName(), function (err, result) {
              graphUtil.deleteGroup(getTestSubGroupName(), function (err, result) {
                graphUtil.deleteUser(getTestUPN(), function (err, result) {
                  graphUtil.deleteUser(getTestUPN2(), function (err, result) {
                    done();
                  });
                });
              });
            });
          });
        });
      });
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
    
    describe('ServicePrincipals', function () {
      it('should work to list and show service principals', function (done) {
        function verifyOutputIsCorrect(output, displayName, spn) {
          return (output.indexOf(displayName) !== -1) && (output.indexOf(spn) !== -1);
        }
        var displayName = process.env.AZURE_AD_TEST_SP_DISPLAY_NAME;
        var spn = process.env.AZURE_AD_TEST_SP_NAME;
        var objectId = process.env.AZURE_AD_TEST_SP_OBJECT_ID;

        suite.execute('ad sp list --json', function (result) {
          result.exitStatus.should.equal(0);
          var text = result.text;
          var seemsCorrect = verifyOutputIsCorrect(text, displayName, spn);
          seemsCorrect.should.equal(true);
          suite.execute('ad sp show --spn %s --json', spn, function (result) {
            result.exitStatus.should.equal(0);
            text = result.text;
            seemsCorrect = verifyOutputIsCorrect(text, displayName, spn);
            seemsCorrect.should.equal(true);
            suite.execute('ad sp show --objectId %s --json', objectId, function (result) {
              result.exitStatus.should.equal(0);
              text = result.text;
              seemsCorrect = verifyOutputIsCorrect(text, displayName, spn);
              seemsCorrect.should.equal(true);
              done();
            });
          });
        });
      });
    })
  });
});