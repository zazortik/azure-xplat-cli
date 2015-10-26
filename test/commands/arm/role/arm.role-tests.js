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
var path = require('path');
var fs = require('fs');
var profile = require('../../../../lib/util/profile');
var utils = require('../../../../lib/util/utils');

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
  { name: 'AZURE_AD_TEST_USER_PRINCIPAL_NAME', defaultValue: 'testUserAuto@rbacCliTest.onmicrosoft.com' },
  { name: 'AZURE_AD_TEST_PASSWORD', defaultValue: 'Pa$$w0rd' },
  { name: 'AZURE_AD_TEST_GROUP_NAME', defaultValue: 'testgroupauto' },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_AD_TEST_SP_DISPLAY_NAME', defaultValue: 'mytestapprandomauto00123456' },
];

describe('arm', function () {
  describe('role', function () {
    var suite;
    var testGroups = [];
    var testUsers = [];
    var testSPs = [];
    var TEST_ROLE_NAME = 'Owner';
    var BUILT_IN_ROLE_TYPE = 'BuiltInRole';
    var GUID_REGEXP = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
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
        listPoll(suite, 5, 'user', userResult.objectId, function (result) {
          graphUtil.createGroup(process.env.AZURE_AD_TEST_GROUP_NAME, function (err, groupResult) {
            if (err) {
              testLogger.logData("create group error : ");
              testLogger.logData(err);
              return cleanupCreatedAdObjects(err, done); 
            }
            testGroups.push(groupResult);
            listPoll(suite, 5, 'group', groupResult.objectId, function (result) {
              graphUtil.createSP(process.env.AZURE_AD_TEST_SP_DISPLAY_NAME, function (err, spResult) {
                if (err) { 
                  testLogger.logData("create sp error : ");
                  testLogger.logData(err);
                  return cleanupCreatedAdObjects(err, done); 
                }
                testSPs.push(spResult);
                listPoll(suite, 5, 'sp', spResult.objectId, function (result) {
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

    function createNewRoleObject() {
      var filePath = path.join(__dirname, '../../../data/CustomRoleDefValid.json');
      var roleToCreate = JSON.parse(fs.readFileSync(filePath));
      
      // Do not use hard-coded assignable scopes so that test still runs successfully when run under a different subscription
      roleToCreate.AssignableScopes = [];
      var assignableScope = "/subscriptions/" + profile.current.getSubscription().id;
      roleToCreate.AssignableScopes[0] = assignableScope;
      roleToCreate.Name = "TestRole_" + utils.uuidGen();
      return roleToCreate;
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
      
      it('list for custom roles should work', function (done) {
        suite.execute('role list --custom --json', function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.type === BUILT_IN_ROLE_TYPE;
          }).should.be.false;
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
      
      it('create new role should work', function (done) {
        var roleToCreate = createNewRoleObject();

        suite.execute('role create -r %s --json', JSON.stringify(roleToCreate), function (result) {
          result.exitStatus.should.equal(0);
          var createdRole = JSON.parse(result.text);
          createdRole.properties.roleName.should.equal(roleToCreate.Name);
          createdRole.properties.assignableScopes.length.should.be.above(0);
          createdRole.properties.assignableScopes[0].should.equal(roleToCreate.AssignableScopes[0]);
          createdRole.properties.permissions.length.should.be.above(0);
          createdRole.properties.permissions[0].actions.length.should.be.above(0);

          // Clean up role
          suite.execute('role delete %s --json -q --passthru', createdRole.id, function (result) {
            result.exitStatus.should.equal(0);
            var deletedRole = JSON.parse(result.text);
            deletedRole.id.should.equal(createdRole.id);
            done();
          });
        });
      });
      
      it('create new role with non-existent file should not work', function (done) {
        var filePath = path.join(__dirname, '../../../data/NonExistenRoleFile.json');
        suite.execute('role create -f %s --json', filePath, function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.containEql("NonExistenRoleFile.json does not exist");
          done();
        });
      });
      
      it('create new role with no input should not work', function (done) {
        suite.execute('role create --json', function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.containEql("At least one of inputfile or roledefinition need to be specified");
          done();
        });
      });
      
      it('delete for custom role with valid id should work', function (done) {
        // Create a custom role
        var roleToCreate = createNewRoleObject();

        suite.execute('role create -r %s --json', JSON.stringify(roleToCreate), function (result) {
          result.exitStatus.should.equal(0);
          var createdRole = JSON.parse(result.text);
          var id = createdRole.id;

          suite.execute('role delete --id %s --json -q --passthru', id, function (result) {
            result.exitStatus.should.equal(0);
            var deletedRole = JSON.parse(result.text);
            deletedRole.id.should.equal(id);
            
            console.log("Role deleted. Trying to delete again should fail.")
            // Deleting the same role again should result in error
            suite.execute('role delete %s --json -q --passthru', id, function (result) {
              result.exitStatus.should.not.equal(0);
              done();
            });
          });
        });
      });

      it('delete for custom role with valid name should work', function (done) {
        // Create a custom role
        var roleToCreate = createNewRoleObject();
        
        suite.execute('role create -r %s --json', JSON.stringify(roleToCreate), function (result) {
          result.exitStatus.should.equal(0);
          var createdRole = JSON.parse(result.text);
          var name = createdRole.properties.roleName;

          suite.execute('role delete --name %s --json -q --passthru', name, function (result) {
            result.exitStatus.should.equal(0);
            var deletedRole = JSON.parse(result.text);
            deletedRole.properties.roleName.should.equal(name);

            console.log("Role deleted. Trying to delete role with invalid name should fail.")
            // Deleting the role with invalid name should result in error
            suite.execute('role delete --name %s --json -q --passthru', "invalid", function (result) {
              result.exitStatus.should.not.equal(0);
              done();
            });
          });
        });
      });
    });

    describe('update role definition', function() {
      it('basic update should work', function(done) {
        var roleToCreate = createNewRoleObject();

        suite.execute('role create -r %s --json', JSON.stringify(roleToCreate), function(result) {
          result.exitStatus.should.equal(0);
          console.log("Role created. Now trying to update");
          var createdRole = JSON.parse(result.text);
          
          var roleToUpdate = roleToCreate;
          roleToUpdate.id = createdRole.id;
          roleToUpdate.name = "UpdatedRole_" + utils.uuidGen();
          roleToUpdate.description = "Updated Role Description";

          suite.execute('role set -r %s --json', JSON.stringify(roleToUpdate), function(updatedResult) {
            updatedResult.exitStatus.should.equal(0);
            var updatedRole = JSON.parse(updatedResult.text);
            updatedRole.properties.roleName.should.equal(roleToUpdate.name);
            updatedRole.properties.description.should.equal("Updated Role Description");
            updatedRole.properties.assignableScopes.length.should.be.above(0);
            updatedRole.properties.assignableScopes[0].should.equal(roleToUpdate.AssignableScopes[0]);
            updatedRole.properties.permissions.length.should.be.above(0);
            updatedRole.properties.permissions[0].actions.length.should.be.above(0);

            // Clean up role
            console.log("Deleting role.");
            suite.execute('role delete %s --json -q --passthru', createdRole.id, function (result) {
              result.exitStatus.should.equal(0);
              var deletedRole = JSON.parse(result.text);
              deletedRole.id.should.equal(createdRole.id);
              done();
            });
          });
        });
      });

      it('fails to update non-existent role', function(done) {
        var filePath = path.join(__dirname, '../../../data/CustomRoleDefValid.json');
        var roleToUpdate = JSON.parse(fs.readFileSync(filePath));
        // random GUID for role id
        roleToUpdate.id = "43367f6e-e106-480d-a448-2a393ea5eb21";

        suite.execute('role set -r %s --json', JSON.stringify(roleToUpdate), function(updatedResult) {
          updatedResult.exitStatus.should.equal(1);
          updatedResult.errorText.should.containEql("The specified role definition with ID \'43367f6e-e106-480d-a448-2a393ea5eb21\' does not exist");

          done();
        });
      });

      it('fails to update role with no Id specified', function (done) {
        var filePath = path.join(__dirname, '../../../data/CustomRoleDefValid.json');
        suite.execute('role set -f %s --json', filePath, function (updatedResult) {
          updatedResult.exitStatus.should.equal(1);
          updatedResult.errorText.should.containEql("roleDefinitionName cannot be null");
          done();
        });
      });
    });

    describe('create ', function () {
      it('a role assignment under subscription should work', function (done) {
        var principalId = testUsers[0].objectId;
        var principal = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        suite.execute('role assignment create --signInName %s -o %s --json', principal, TEST_ROLE_NAME, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --signInName %s -o %s --json', principal, TEST_ROLE_NAME, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;
            
            //simple assignment list should also work
            suite.execute('role assignment list --json', function (listResult) {
              listResult.exitStatus.should.equal(0);
              var assignments = JSON.parse(listResult.text);
              assignments.length.should.be.above(-1);
              //clean up
              suite.execute('role assignment delete --signInName %s -o %s -q --json', principal, TEST_ROLE_NAME, function (result) {
                result.exitStatus.should.equal(0);
                done();
              });
            });
          });
        });
      });
      
      it('a role assignment under resource group should work', function (done) {
        var principalId = testUsers[0].objectId;
        var principal = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        suite.execute('role assignment create --signInName %s -o %s -g %s --json', principal, TEST_ROLE_NAME, testResourceGroup, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --signInName %s -o %s -g %s --json', principal, TEST_ROLE_NAME, testResourceGroup, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + testResourceGroup + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;
            
            //clean up
            suite.execute('role assignment delete --signInName %s -o %s -g %s -q --json', principal, TEST_ROLE_NAME, testResourceGroup, function (result) {
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
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === adGroupObjectId);
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
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === objectId);
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
        suite.execute('role assignment create --signInName %s -o %s -g %s -r %s -u %s --parent %s --json', principal, 'Reader', testResourceGroup, 
                      'Microsoft.Sql/servers/databases', testSqlDb, testParent, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('role assignment list --signInName %s -g %s -r %s -u %s --parent %s --json', principal, testResourceGroup, 
                        'Microsoft.Sql/servers/databases', testSqlDb, testParent, function (listAssignmentResult) {
            var assignments = JSON.parse(listAssignmentResult.text);
            assignments.some(function (res) {
              var scopePattern = '^/subscriptions/' + GUID_REGEXP + '/resourcegroups/' + testResourceGroup + 
                                 '/providers/Microsoft.Sql/servers/' + testSqlServer + '/databases/' + testSqlDb + '$';
              return (res.properties.scope.match(scopePattern) && res.properties.principalId === principalId);
            }).should.be.true;
            
            //clean up
            suite.execute('role assignment delete --signInName %s -o %s -g %s -r %s -u %s --parent %s -q --json', principal, 'Reader', 
                          testResourceGroup, 'Microsoft.Sql/servers/databases', testSqlDb, testParent, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      
      it('a role assignment to list with different scopes', function (done) {
        var principal = process.env.AZURE_AD_TEST_USER_PRINCIPAL_NAME;
        var principalId = testUsers[0].objectId;
        var subscriptionScope = "/subscriptions/" + profile.current.getSubscription().id;
        var resourceGroupScope = subscriptionScope + '/resourcegroups/' + testResourceGroup;
        var resourceScope = resourceGroupScope + '/providers/Microsoft.Sql/servers/' + testSqlServer + '/databases/' + testSqlDb;
        
        suite.execute('role assignment create --signInName %s --roleName %s --scope %s --json', principal, 'Reader', subscriptionScope, function (result) {
          result.exitStatus.should.equal(0);
          
          suite.execute('role assignment create --objectId %s --roleName %s --scope %s --json', principalId, 'Reader', resourceScope, function (result) {
            result.exitStatus.should.equal(0);
            
            // list without scope
            suite.execute('role assignment list --signInName %s --roleName %s --json', principal, 'Reader', function (listAssignmentResult) {
              listAssignmentResult.exitStatus.should.equal(0);
              var assignments = JSON.parse(listAssignmentResult.text);
              assignments.length.should.equal(2);
              assignments.some(function (res) {
                return (res.properties.scope === subscriptionScope && res.properties.principalId === principalId && 
                      res.properties.roleName.toLowerCase() === "reader");
              }).should.be.true;
              
              // list for subscription scope
              suite.execute('role assignment list --signInName %s --roleName %s --scope %s --json', principal, 'Reader', subscriptionScope, function (listAssignmentResult) {
                listAssignmentResult.exitStatus.should.equal(0);
                var assignments = JSON.parse(listAssignmentResult.text);
                assignments.length.should.equal(1);
                assignments.some(function (res) {
                  return (res.properties.scope === subscriptionScope && res.properties.principalId === principalId && 
                      res.properties.roleName.toLowerCase() === "reader");
                }).should.be.true;
                
                // delete for default scope
                suite.execute('role assignment delete --signInName %s -o %s -q --json --passthru', principal, 'Reader', 
                          function (result) {
                  result.exitStatus.should.equal(0);
                  var assignment = JSON.parse(result.text);
                  (assignment.properties.scope === subscriptionScope && assignment.properties.principalId === principalId && 
                      assignment.properties.roleName.toLowerCase() === "reader").should.be.true;
                  
                  // delete for resource scope
                  suite.execute('role assignment delete --signInName %s -o %s --scope %s -q --json --passthru', principal, 'Reader', 
                          resourceScope, function (result) {
                    result.exitStatus.should.equal(0);
                    var assignment = JSON.parse(result.text);
                    (assignment.properties.scope === resourceScope && assignment.properties.principalId === principalId && 
                      assignment.properties.roleName.toLowerCase() === "reader").should.be.true;
                    done();
                  });
                });
              });
            });
          });
        });
      });


      it('create and delete role assignment using roleId should work', function (done) {
        var principalId = testUsers[0].objectId;
        var subscriptionScope = "/subscriptions/" + profile.current.getSubscription().id;
        suite.execute('role show %s --json', "Reader", function (result) {
          result.exitStatus.should.equal(0);
          var roles = JSON.parse(result.text);
          roles.some(function (res) {
            return res.properties.roleName === "Reader";
          }).should.be.true;
          var roleId = roles[0].id;

          suite.execute('role assignment create --objectId %s --roleId %s --scope %s --json', principalId, roleId, subscriptionScope, function (result) {
            result.exitStatus.should.equal(0);
            var assignment = JSON.parse(result.text);
            (assignment.properties.scope === subscriptionScope && assignment.properties.principalId === principalId && 
                      assignment.properties.roleName.toLowerCase() === "reader").should.be.true;

            // list for subscription scope
            suite.execute('role assignment list --objectId %s --roleName %s --scope %s --json', principalId, 'Reader', subscriptionScope, function (listAssignmentResult) {
              listAssignmentResult.exitStatus.should.equal(0);
              var assignments = JSON.parse(listAssignmentResult.text);
              assignments.length.should.equal(1);
              assignments.some(function (res) {
                return (res.properties.roleDefinitionId === roleId);
              }).should.be.true;

              // delete for default scope
              suite.execute('role assignment delete --objectId %s -d %s -q --json --passthru', principalId, roleId, function (deleteResult) {
                deleteResult.exitStatus.should.equal(0);
                var assignment = JSON.parse(deleteResult.text);
                (assignment.properties.scope === subscriptionScope && assignment.properties.principalId === principalId && 
                      assignment.properties.roleName.toLowerCase() === "reader").should.be.true;
                done();
              });
            });
          });
        });
      });
    });
  });
});