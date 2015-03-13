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
var testLogger = require('../../../framework/test-logger');
var graphUtil = require('../../../util/graphUtils');
var testprefix = 'arm-cli-role-tests';
var util = require('util');
var testResourceGroup;
var testSqlServer;
var testSqlDb;
var testLocation;
var testParent;
var testApiVersion = '2.0';
var createdGroups = [];
var createdResources = [];
var calledOnce = false;
var requiredEnvironment = [
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME', defaultValue: 'testUserRandom3@rbactest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_PASSWORD'},
  { name: 'AZURE_AD_TEST_GROUP_NAME', defaultValue: 'testgroupRandom3' },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_AD_TEST_SP_DISPLAY_NAME', defaultValue: 'mytestapprandom9365' },
];

describe('arm', function () {
  describe('role', function () {
    var suite;
    var testGroups = [];
    var testUsers = [];
    var testSPs = [];
    var TEST_ROLE_NAME = 'Owner';
    var GUID_REGEXP = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    before(function (done) {
      suite = new CLITest(testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        testResourceGroup = suite.generateId('testrg1', createdGroups);
        testSqlServer = suite.generateId('testserver1', createdResources);
        testSqlDb = suite.generateId('testdb1', createdResources);
        testParent = 'servers/' + testSqlServer;
        if (!suite.isPlayback()) {
          setupSql(done);
        } else {
          done();
        }  
      });
    });

    after(function (done) {
      suite.teardownSuite(function () {
        if (!suite.isPlayback()) {
          cleanupSql();
          cleanupCreatedAdObjects(null, done);
        } else {
          done();
        }
      });
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        if (!calledOnce) {
          calledOnce = true;
          setupADObjects(done);
        } else {
          done();
        } 
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    function setupSql(done) {
      //create a sql server and a database
      testLocation = process.env['AZURE_ARM_TEST_LOCATION'];
      var serverParams = "{\"administratorLogin\": \"testadmin\", \"administratorLoginPassword\": \"Pa$$word1234\"}";
      var dbParams = "{\"maxSizeBytes\": \"1073741824\", \"edition\" : \"Web\", \"collation\": \"SQL_1xcompat_CP850_CI_AS\"}";
      suite.execute('group create -n %s -l %s --json', testResourceGroup, testLocation, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('resource create -g %s -n %s -l %s -r %s -p %s -o %s', testResourceGroup, testSqlServer, 
          testLocation, 'Microsoft.Sql/servers', serverParams, testApiVersion, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('resource create -g %s -n %s -l %s --parent %s -r %s -p %s -o %s', testResourceGroup, 
            testSqlDb, testLocation, testParent, 'Microsoft.Sql/servers/databases', dbParams, testApiVersion, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    }

    function cleanupSql () {
      var numOfCleanedUpGroups = 0;
      function deleteGroups(index, callback) {
        if (index === createdGroups.length) {
          return callback();
        }
        suite.execute('group delete %s --quiet -vv', createdGroups[index], function () {
          deleteGroups(index + 1, callback);
        });
      }

      deleteGroups(numOfCleanedUpGroups, function () {
        numOfCleanedUpGroups = createdGroups.length;
      });
    }

    function setupADObjects (done) {
      //create AD objects
      graphUtil.createUser(process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME, process.env.AZURE_AD_TEST_PASSWORD, function (err, userResult) {
        if (err) { 
          testLogger.logData("create user error : ");
          testLogger.logData(err); 
          return cleanupCreatedAdObjects(err, done); 
        }
        testUsers.push(userResult);
        listPoll(suite, 3, 'user', userResult.objectId, function (result) {
          graphUtil.createGroup(process.env.AZURE_AD_TEST_GROUP_NAME, function (err, groupResult) {
            if (err) {
              testLogger.logData("create group error : ");
              testLogger.logData(err);
              return cleanupCreatedAdObjects(err, done); 
            }
            testGroups.push(groupResult);
            listPoll(suite, 3, 'group', groupResult.objectId, function (result) {
              graphUtil.createSP(process.env.AZURE_AD_TEST_SP_DISPLAY_NAME, function (err, spResult) {
                if (err) { 
                  testLogger.logData("create sp error : ");
                  testLogger.logData(err);
                  return cleanupCreatedAdObjects(err, done); 
                }
                testSPs.push(spResult);
                listPoll(suite, 3, 'sp', spResult.objectId, function (result) {
                  done();
                }); 
              });
            });    
          });
        });
      });
    }

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

    function listPoll(suite, attemptsLeft, objectType, objectId, callback) {
      if(attemptsLeft === 0) {
        throw new Error('azure ad ' + objectType + ' list did not receive expected response');
      }
      var cmd = 'ad ' + objectType + ' list --json';
      var objectFound = false;
      suite.execute(cmd, function (result) {
        result.exitStatus.should.equal(0);
        var adObjects = JSON.parse(result.text);
        objectFound = adObjects.some(function (res) { return res.objectId === objectId; });
        attemptsLeft -= 1;
        if (!objectFound) {
          setTimeout(function () {
            console.log('Listing ' + objectType + ' with objectId ' + objectId + 
                        '. '+ attemptsLeft + ' attempt(s) left...');
            listPoll(suite, attemptsLeft, objectType, objectId, callback);
          }, 15000);
        }
        else {
          callback(objectFound);
        }
      });
    }

    describe('definition', function () {
      it('list should work', function (done) {
        suite.execute('role list --json', function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.roleName === TEST_ROLE_NAME;
          }).should.be.true;
          done();
        });
      });

      it('show for Owner role should work', function (done) {
        suite.execute('role show %s --json', TEST_ROLE_NAME, function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.roleName === TEST_ROLE_NAME;
          }).should.be.true;
          done();
        });
      });
    });

    describe('create ', function () {
      it('a role assignment under subscripton should work', function (done) {
        var principalId = testUsers[0].objectId;
        var principal = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        suite.execute('role assignment create --upn %s -o %s --json', principal, TEST_ROLE_NAME, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --upn %s -o %s --json', principal, TEST_ROLE_NAME, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;

            //clean up
            suite.execute('role assignment delete --upn %s -o %s -q --json', principal, TEST_ROLE_NAME, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });

      it('a role assignment under resource group should work', function (done) {
        var principalId = testUsers[0].objectId;
        var principal = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        suite.execute('role assignment create --upn %s -o %s -g %s --json', principal, TEST_ROLE_NAME, testResourceGroup, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --upn %s -o %s -g %s --json', principal, TEST_ROLE_NAME, testResourceGroup, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + testResourceGroup + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;

            //clean up
            suite.execute('role assignment delete --upn %s -o %s -g %s -q --json', principal, TEST_ROLE_NAME, testResourceGroup, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });

      it('a role assignment using an ad group should work', function (done) {
        var adGroupObjectId = testGroups[0].objectId;

        suite.execute('role assignment create --objectId %s -o %s -g %s --json', adGroupObjectId, TEST_ROLE_NAME, testResourceGroup, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --objectId %s -o %s -g %s --json', adGroupObjectId, TEST_ROLE_NAME, testResourceGroup, function (listAssignmentResult) {
            
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + testResourceGroup + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === adGroupObjectId &&
                      res.properties.actions === "*");
            }).should.be.true;
            
            //clean up
            suite.execute('role assignment delete --objectId %s -o %s -g %s -q --json', adGroupObjectId, TEST_ROLE_NAME, testResourceGroup, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });

      it('a role assignment using an ad service principal should work', function (done) {
        var spn = testSPs[0].servicePrincipalNames[0];
        var objectId = testSPs[0].objectId;

        suite.execute('role assignment create --spn %s -o %s -g %s --json', spn, TEST_ROLE_NAME, testResourceGroup, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --spn %s -o %s -g %s --json', spn, TEST_ROLE_NAME, testResourceGroup, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + testResourceGroup + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === objectId &&
                      res.properties.actions === "*");
            }).should.be.true;
            
            //clean up
            suite.execute('role assignment delete --spn %s -o %s -g %s -q --json', spn, TEST_ROLE_NAME, testResourceGroup, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });

      it('a role assignment to access a child resource as a Reader using separate switches should work', function (done) {
        var principal = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        var principalId = testUsers[0].objectId;
        suite.execute('role assignment create --upn %s -o %s -g %s -r %s -u %s --parent %s --json', principal, 'reader', testResourceGroup, 
                      'Microsoft.Sql/servers/databases', testSqlDb, testParent, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --upn %s -g %s -r %s -u %s --parent %s --json', principal, testResourceGroup, 
                        'Microsoft.Sql/servers/databases', testSqlDb, testParent, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + testResourceGroup + 
                                 '/providers/Microsoft.Sql/servers/' + testSqlServer + '/databases/' + testSqlDb + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId && 
                      res.properties.actions === "*/read");
            }).should.be.true;

            //clean up
            suite.execute('role assignment delete --upn %s -o %s -g %s -r %s -u %s --parent %s -q --json', principal, 'reader', 
                          testResourceGroup, 'Microsoft.Sql/servers/databases', testSqlDb, testParent, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
    });
  });
});