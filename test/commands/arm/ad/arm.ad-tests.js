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
var testLogger = require('../../../framework/test-logger');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-ad-tests';
var util = require('util');
var calledOnce = false;

var requiredEnvironment = [
  { name: 'AZURE_AD_TEST_PASSWORD' },
  { name: 'AZURE_AD_TEST_GROUP_NAME', defaultValue: 'Randomtestgroup1' },
  { name: 'AZURE_AD_TEST_SUBGROUP_NAME', defaultValue: 'Randomtestgroup2' },
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME', defaultValue: 'RandomtestUser1@rbactest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME2', defaultValue: 'RandomtestUser2@rbactest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_SP_DISPLAY_NAME', defaultValue: 'Randommytestapp9045' },
];

describe('arm', function () {
  describe('ad', function () {
    var suite;
    var testGroups = [];
    var testUsers = [];
    var testSPs = [];

    function deleteAdObject(objects, deleteFn, callback) {
      if (objects.length === 0) {
        return callback();
      }

      deleteFn(objects[0], function (err, result) {
        deleteAdObject(objects.slice(1), deleteFn, callback);
      });
    }

    function cleanupCreatedAdObjects(err, callback) {
      deleteAdObject(testGroups, graphUtil.deleteGroup, function (err) {
        deleteAdObject(testUsers, graphUtil.deleteUser, function (err) {
          deleteAdObject(testSPs, graphUtil.deleteSP, function (err) {
            callback(err);
          });
        });
      });
    }

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(done);
    });
    
    after(function (done) {
      suite.teardownSuite(function () {
        cleanupCreatedAdObjects(null, done);
      });
    });
    
    beforeEach(function (done) {
      suite.setupTest(function () {
        if (!calledOnce) {
          calledOnce = true;
          performTestSetup(done);
        } else {
          done();
        }
      });
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    function performTestSetup (done) {
      graphUtil.createGroup(process.env.AZURE_AD_TEST_GROUP_NAME, function (err, result) {
        if (err) { 
          testLogger.logData("create group1 " + process.env.AZURE_AD_TEST_GROUP_NAME + " error : ");
          testLogger.logData(err);
          return cleanupCreatedAdObjects(err, done);
        }
        testGroups.push(result);
        graphUtil.createGroup(process.env.AZURE_AD_TEST_SUBGROUP_NAME, function (err, result) {
          if (err) { 
            testLogger.logData("create group2 " + process.env.AZURE_AD_TEST_SUBGROUP_NAME + " error : ");
            testLogger.logData(err);
            return cleanupCreatedAdObjects(err, done); 
          }
          testGroups.push(result);
          graphUtil.createUser(process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME, process.env.AZURE_AD_TEST_PASSWORD, function (err, result) {
            if (err) { 
              testLogger.logData("create user1 " + process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME + " error : ");
              testLogger.logData(err); 
              return cleanupCreatedAdObjects(err, done);
            }
            testUsers.push(result);
            graphUtil.createUser(process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME2, process.env.AZURE_AD_TEST_PASSWORD, function (err, result) { 
              if (err) {
                testLogger.logData("create user2 " + process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME2 + " error : ");
                testLogger.logData(err);
                return cleanupCreatedAdObjects(err, done);
              }
              //(testUser1 must be a member of testGroup1, but not of testGroup2)
              testUsers.push(result);
              graphUtil.addGroupMember(testGroups[0], testUsers[0], function (err, result) { 
                if (err) { 
                  testLogger.logData("add user1 to group1 error : ");
                  testLogger.logData(err); 
                  return cleanupCreatedAdObjects(err, done); 
                }
                //(testgroup2 must be a member of testgroup1)
                graphUtil.addGroupMember(testGroups[0], testGroups[1], function (err, result) {
                  if (err) { 
                    testLogger.logData("add user2 to group2 error : ");
                    testLogger.logData(err);
                    return cleanupCreatedAdObjects(err, done); 
                  }
                  graphUtil.createSP(process.env.AZURE_AD_TEST_SP_DISPLAY_NAME, function (err, result) {
                    if (err) { 
                      testLogger.logData("create sp " + process.env.AZURE_AD_TEST_SP_DISPLAY_NAME + "error : ");
                      testLogger.logData(err);
                      return cleanupCreatedAdObjects(err, done);
                    }
                    testSPs.push(result);
                    //servicePrincipal mytestapp9045 must be a member of testgroup1
                    graphUtil.addGroupMember(testGroups[0], testSPs[0], function (err, result) {
                      if (err) { 
                        testLogger.logData("add sp to group1 error : ");
                        testLogger.logData(err);
                        return cleanupCreatedAdObjects(err, done);
                      }
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    describe('Users', function () {

      it('should parse the error properly for a non existant user', function (done) {
        suite.execute('ad user show --upn %s --json', 'nonexisitinguser@mywebforum.com', function (result) {
          result.errorText.should.include('No matching user was found');
          done();
        });
      });

      it('should work to list and show users', function (done) {
        var upn = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        var upn2 = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME2;
        suite.execute('ad user list --json', function (result) {
          result.exitStatus.should.equal(0);
          var users = JSON.parse(result.text);
          users.some(function(user) { return user.userPrincipalName === upn; }).should.be.true;
          users.some(function(user) { return user.userPrincipalName === upn2; }).should.be.true;

          suite.execute('ad user show --upn %s --json', upn, function (result) {
            result.exitStatus.should.equal(0);
            var user = JSON.parse(result.text);
            user[0].userPrincipalName.should.equal(upn);
            done();
          });
        });
      });
    });
    
    describe('Groups', function () {
      it('should work to list and show groups', function (done) {
        var group1 = process.env.AZURE_AD_TEST_GROUP_NAME;
        var group1ObjectId = testGroups[0].objectId;
        var group2 = process.env.AZURE_AD_TEST_SUBGROUP_NAME;
        var member1 = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        var memberGroupObjectId = testGroups[1].objectId;
        var memberUserObjectId = testUsers[0].objectId;
        var memberSPObjectId = testSPs[0].objectId;
        suite.execute('ad group list --json', function (result) {
          result.exitStatus.should.equal(0);
          var groups = JSON.parse(result.text);
          groups.some(function(group) { return group.displayName === group1; }).should.be.true;
          groups.some(function(group) { return group.displayName === group2; }).should.be.true;
          suite.execute('ad group show --search %s --json', group1, function (result) {
            result.exitStatus.should.equal(0);
            var groupShowOutput = JSON.parse(result.text);
            groupShowOutput[0].displayName.should.equal(group1);
            suite.execute('ad group member list --objectId %s --json', group1ObjectId, function (result) {
              result.exitStatus.should.equal(0);
              var members = JSON.parse(result.text);
              members.some(function(member) { return member.objectId === memberGroupObjectId; }).should.be.true;
              members.some(function(member) { return member.objectId === memberUserObjectId; }).should.be.true;
              members.some(function(member) { return member.objectId === memberSPObjectId; }).should.be.true;
              done();
            });
          });
        });
      });
    });
    
    describe('ServicePrincipals', function () {
      it('should work to list and show service principals', function (done) {
        var displayName = process.env.AZURE_AD_TEST_SP_DISPLAY_NAME;
        var spn = testSPs[0].servicePrincipalNames[0];
        var spObjectId = testSPs[0].objectId;

        suite.execute('ad sp list --json', function (result) {
          result.exitStatus.should.equal(0);
          var sps = JSON.parse(result.text);
          suite.execute('ad sp show --spn %s --json', spn, function (result) {
            result.exitStatus.should.equal(0);
            var spShowOutput = JSON.parse(result.text);
            spShowOutput[0].servicePrincipalNames.some(function(rcvdspn) { return rcvdspn === spn; }).should.be.true;
            suite.execute('ad sp show --objectId %s --json', spObjectId, function (result) {
              result.exitStatus.should.equal(0);
              var spShow = JSON.parse(result.text);
              spShow[0].objectId.should.equal(spObjectId);
              done();
            });
          });
        });
      });
    })
  });
});