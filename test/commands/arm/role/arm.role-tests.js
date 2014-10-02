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
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME', defaultValue: 'testUser3@rbactest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_PASSWORD'},
  { name: 'AZURE_AD_TEST_GROUP_NAME', defaultValue: 'testgroup3' },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_AD_TEST_SP_DISPLAY_NAME', defaultValue: 'mytestapp9190' },
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
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(function () {
        if (!suite.isPlayback()) {
          cleanup();
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
          setup(done);
        } else {
          done();
        } 
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

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

    function setup(done) {
      //create AD objects
      graphUtil.createUser(process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME, process.env.AZURE_AD_TEST_PASSWORD, function (err, result) {
        if (err) { return cleanupCreatedAdObjects(err, done); }
        testUsers.push(result);
        graphUtil.createGroup(process.env.AZURE_AD_TEST_GROUP_NAME, function (err, result) {
          if (err) { return cleanupCreatedAdObjects(err, done); }
          testGroups.push(result);
          graphUtil.createSP(process.env.AZURE_AD_TEST_SP_DISPLAY_NAME, function (err, result) {
            if (err) { return cleanupCreatedAdObjects(err, done); }
            testSPs.push(result);
          });
        });
      });
      //create a sql server and a database
      testResourceGroup = suite.generateId('testrg1', createdGroups);
      testSqlServer = suite.generateId('testserver1', createdResources);
      testSqlDb = suite.generateId('testdb1', createdResources);
      testLocation = process.env['AZURE_ARM_TEST_LOCATION'];
      var serverParams = "{\"administratorLogin\": \"testadmin\", \"administratorLoginPassword\": \"Pa$$word1234\"}";
      var dbParams = "{\"maxSizeBytes\": \"1073741824\", \"edition\" : \"Web\", \"collation\": \"SQL_1xcompat_CP850_CI_AS\"}";
      testParent = 'servers/' + testSqlServer;

      if (!suite.isPlayback()) {
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
      } else {
        done();
      }
    }

    function cleanup() {
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

    describe('list all built-in roles', function () {
      it('should work', function (done) {
        suite.execute('role list --json', function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.roleName === TEST_ROLE_NAME;
          }).should.be.true;
          done();
        });
      });
    });

    describe('show a built-in role of Owner', function () {
      it('should work', function (done) {
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

    describe('create a role assignment under subscripton', function () {
      it('should work', function (done) {
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
    });

    describe('create a role assignment under resource group', function () {
      it('should work', function (done) {
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
    });

    describe('create a role assignment using an ad group', function () {
      it('should work', function (done) {
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
    });

    describe('create a role assignment using an ad service principal', function () {
      it('should work', function (done) {
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
    });

    describe('create a role assignment to access a child resource', function () {
      it('as a Reader using separate switches should work', function (done) {
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