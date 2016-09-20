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

var util = require('util');
var fs = require('fs');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-resource-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_ARM_TEST_SQL_RESOURCE_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_ARM_TEST_WEBSITES_RESOURCE_LOCATION', defaultValue: 'South Central US' }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('resource', function () {
    var suite;
    var testApiVersion = '2014-04-01';
    var testGroupLocation;
    var testSqlResourceLocation;
    var testWebsitesResourceLocation;

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        testGroupLocation = process.env['AZURE_ARM_TEST_LOCATION'];
        testSqlResourceLocation = process.env['AZURE_ARM_TEST_SQL_RESOURCE_LOCATION'];
        testWebsitesResourceLocation = process.env['AZURE_ARM_TEST_WEBSITES_RESOURCE_LOCATION'];
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('create', function () {
      it('should work without switches', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        suite.execute('group create -n %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "name": "' + resourceName + '", "siteMode": "Limited", "computeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group show %s --json', groupName, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var group = JSON.parse(showResult.text);
              group.resources.some(function (res) {
                return res.name === resourceName && utils.stringEndsWith(res.id, resourceName);
              }).should.be.true;

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
            });

      it('should work with sku', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        suite.execute('group create -n %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);
              
          suite.execute('resource create %s %s %s %s -p %s --sku %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "name": "' + resourceName + '", "siteMode": "Limited", "computeMode": "Shared" }', '{ "name": "F0", "tier" : "Free", "size" : "A0" }', function (result) {
            var resourceId = result.text.split(':')[1].split(",")[0].split("\"")[1];
            result.exitStatus.should.equal(0);

            suite.execute('group show %s --json', groupName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              var group = JSON.parse(showResult.text);
              group.resources.some(function (res) {
                return res.name === resourceName && utils.stringEndsWith(res.id, resourceName);
              }).should.be.true;
                          
              suite.execute('resource show -i %s -o %s --json', resourceId, testApiVersion, function (showResult) {
                showResult.exitStatus.should.equal(0);
                JSON.parse(showResult.text).properties.sku.should.equal('Free');
                                
                suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
                  });
                });
              });
            });
          });
        });

      it('should error with incorrectly formatted sku', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        suite.execute('group create -n %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);
            
          suite.execute('resource create %s %s %s %s -p %s --sku %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', '{ "random": "aa", "tier" : "free", "size" : "A0" }', function (result) {
            var expectedError = util.format('Required property \'name\' not found in JSON. Path \'sku\'');
                        result.errorText.should.include(expectedError);

            suite.execute('group delete %s --quiet --json', groupName, function () {
              done();
            });
          });
        }); 
      });

      it.skip('should work with plan', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        suite.execute('group create -n %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);
            
          suite.execute('resource create %s %s %s %s --plan %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{"apiVersion":"2015-08-01","name":"testingPlan","type":"Microsoft.Web/serverfarms"}', function (result) {
            var resourceId = result.text.split(':')[1].split(",")[0].split("\"")[1];
            result.exitStatus.should.equal(0);
              
            suite.execute('group show %s --json', groupName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              var group = JSON.parse(showResult.text);
              group.resources.some(function (res) {
                  return res.name === resourceName && utils.stringEndsWith(res.id, resourceName);
              }).should.be.true;
                
              suite.execute('resource show -i %s -o %s --json', resourceId, testApiVersion, function (showResult) {
                showResult.exitStatus.should.equal(0);
                suite.execute('group delete %s --quiet --json', groupName, function () {
                  done();
                });
              });
            });
          });
        });
      });

      it('should error with non-third party plan', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        suite.execute('group create -n %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --plan %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', '{ "name": "User Defined", "publisher" : "Microsoft" , "product" : "tester", "version": "2.0.1" }', function (result) {
            var expectedError = util.format('Resource plan can only be set for 3rd party store resources.');
            result.errorText.should.include(expectedError);

            suite.execute('group delete %s --quiet --json', groupName, function () {
              done();
            });
          });
        });
      });


      //Might fail: Tracking: RD Bug 1713392: failed to delete 'Microsoft.Sql/servers/databases' resource
      //it('should work with switches', function (done) {
      //  var groupName = suite.generateId('xTestResource1', createdGroups, suite.isMocked);
      //  var parentResourceName = suite.generateId('xtestgrpparentresource13', createdResources);
      //  var childResourceName = suite.generateId('xtestgrpchildresource13', createdResources);
      //  var adminUsername = 'xtestgrpuser';
      //  var adminPassword = 'Pa$$word1234';
      //  var parentRsrc = 'servers/' + parentResourceName;
      //  suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
      //    result.exitStatus.should.equal(0);

      //    //creates the parent resource - sql server
      //    suite.execute('resource create -g %s -n %s -r %s -l %s -o %s -p %s --json', groupName, parentResourceName, 'Microsoft.Sql/servers', testSqlResourceLocation, '2.0', '{"administratorLogin": "' + adminUsername + '", "administratorLoginPassword": "' + adminPassword + '"}', function (result) {
      //      result.exitStatus.should.equal(0);

      //      suite.execute('group show %s --json', groupName, function (showResult) {
      //        showResult.exitStatus.should.equal(0);

      //        var group = JSON.parse(showResult.text);
      //        group.resources.some(function (res) {
      //          return res.name === parentResourceName;
      //        }).should.be.true;

      //        //creates the child resource - sql database
      //        suite.execute('resource create -g %s -n %s -r %s -l %s -o %s --parent %s -p %s --json', groupName, childResourceName, 'Microsoft.Sql/servers/databases', testSqlResourceLocation, '2.0', parentRsrc, '{"maxSizeBytes": "5368709120", "edition" : "Web", "collation": "SQL_1xcompat_CP850_CI_AS"}', function (result) {
      //          result.exitStatus.should.equal(0);

      //          suite.execute('group show %s --json', groupName, function (showResult) {
      //            showResult.exitStatus.should.equal(0);
                    //TODO, when the test gets enabled, add simple verification here that we don't show parent resouce name. (Fixes to RD 1546440)
      //            var group = JSON.parse(showResult.text);
      //            var resourceName = parentResourceName + '/' + childResourceName;
      //            group.resources.some(function (res) {
      //              return res.name === resourceName;
      //            }).should.be.true;
      //            //delete the child resource - sql database
      //            suite.execute('resource delete -g %s -n %s -r %s -o %s --parent %s --quiet --json', groupName, childResourceName, 'Microsoft.Sql/servers/databases', '2.0', parentRsrc, function (deleteResult) {
      //              deleteResult.exitStatus.should.equal(0);
      //              //delete the parent resource - sql server
      //              suite.execute('resource delete -g %s -n %s -r %s -o %s --quiet --json', groupName, parentResourceName, 'Microsoft.Sql/servers', '2.0', function (deleteResult) {
      //                deleteResult.exitStatus.should.equal(0);
      //                //delete the group
      //                suite.execute('group delete %s --quiet --json', groupName, function (deleteResult) {
      //                  deleteResult.exitStatus.should.equal(0);
      //                  done();
      //                });
      //              });
      //            });
      //          });
      //        });
      //      });
      //    });
      //  });
      //});

      it('should fail if the group does not exist', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
          result.exitStatus.should.equal(1);
          var expectedError = util.format('Resource group \'%s\' could not be found.', groupName);
          result.errorText.should.include(expectedError);
          done();
        });
      });
    });

    describe('delete', function () {
      it('should work', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        
        suite.execute('group create %s --location %s --json', groupName, testWebsitesResourceLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource delete %s %s %s %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (result) {
              result.exitStatus.should.equal(0);

              suite.execute('group show %s --json', groupName, function (showResult) {
                showResult.exitStatus.should.equal(0);

                var group = JSON.parse(showResult.text);
                group.resources.some(function (res) {
                  return res.name === resourceName;
                }).should.be.false;

                suite.execute('group delete %s --quiet --json', groupName, function () {
                  done();
                });
              });
            });
          });
        });
      });

      it('should delete by id', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        
        suite.execute('group create %s --location %s --json', groupName, testWebsitesResourceLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);
            var resourceId = result.text.split(':')[1].split(",")[0].split("\"")[1];

             suite.execute('resource show %s %s %s -o %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);

            suite.execute('resource delete -i %s -o %s --quiet --json', resourceId, testApiVersion, function (result) {
              result.exitStatus.should.equal(0);

              suite.execute('group show %s --json', groupName, function (showResult) {
                showResult.exitStatus.should.equal(0);

                var group = JSON.parse(showResult.text);
                group.resources.some(function (res) {
                  return res.name === resourceName;
                }).should.be.false;

                suite.execute('group delete %s --quiet --json', groupName, function () {
                                        done();
                  });
                });
              });
            });
          });
        });
      });
    });

    describe('list', function () {
      it('should work without filters', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource list %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should work with group name and resource type filters', function (done) {
        var groupName1 = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName1 = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        var groupName2 = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName2 = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName1, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group create %s --location %s --json', groupName2, testGroupLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource create %s %s %s %s -p %s --json', groupName1, resourceName1, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName1 + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
              result.exitStatus.should.equal(0);

              suite.execute('resource create %s %s %s %s -p %s --json', groupName2, resourceName2, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName2 + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
                result.exitStatus.should.equal(0);

                suite.execute('resource list -g %s -r %s --json', groupName1, 'Microsoft.Web/sites', function (listResult) {
                  listResult.exitStatus.should.equal(0);

                  var results = JSON.parse(listResult.text);
                  results.length.should.equal(1);

                  results.some(function (res) {
                    return res.name === resourceName1;
                  }).should.be.true;

                  suite.execute('group delete %s --quiet --json', groupName1, function () {
                    suite.execute('group delete %s --quiet --json', groupName2, function () {
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

    describe('show', function () {
      it('should work with positional', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource show %s %s %s %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var resource = JSON.parse(showResult.text);
              resource.name.should.equal(resourceName);
              resource.location.should.equal(testWebsitesResourceLocation);
              resource.permissions[0].actions[0].should.equal('*');
              resource.permissions[0].notActions.length.should.equal(0);
              utils.stringEndsWith(resource.id, resourceName).should.be.true;
              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should work with switches', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource show -g %s -n %s -r %s -o %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var resource = JSON.parse(showResult.text);
              resource.name.should.equal(resourceName);
              resource.location.should.equal(testWebsitesResourceLocation);

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should show by id starting with subscription', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            var resourceId = result.text.split(':')[1].split(",")[0].split("\"")[1];
            result.exitStatus.should.equal(0);

              suite.execute('resource show -i %s -o %s --json', resourceId, testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);
              var resource = JSON.parse(showResult.text);
              resource.name.should.equal(resourceName);
              resource.location.should.equal(testWebsitesResourceLocation);

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should show by id starting with resourceGroup', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            var resourceId = result.text.split(':')[1].split(",")[0].split("\"")[1];
            resourceId = resourceId.split("/").slice(3, resourceId.length).join("/");
            result.exitStatus.should.equal(0);

            suite.execute('resource show -i %s -o %s --json', resourceId, testApiVersion, function (showResult) {
            showResult.exitStatus.should.equal(0);
              var resource = JSON.parse(showResult.text);
              resource.name.should.equal(resourceName);
              resource.location.should.equal(testWebsitesResourceLocation);

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });
    });

    describe('move', function () {
      it('should work', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var destinationGroupName = suite.generateId('xTestResource2', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        
        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);
          
          //create sample resource to move
          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);
            
            //get the resource id
            suite.execute('resource show %s %s %s %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);
              var resourceId = JSON.parse(showResult.text).id;
              
              //perform move to destination group
              suite.execute('group create %s --location %s --json', destinationGroupName, testGroupLocation, function (result) {
                suite.execute('resource move -i %s -d %s -q', resourceId, destinationGroupName, function (moveResult) {
                  moveResult.exitStatus.should.equal(0);
                  
                  //validate move was successful
                  suite.execute('resource show %s %s %s %s --json', destinationGroupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                    showResult.exitStatus.should.equal(0);
                    suite.execute('group delete %s --quiet --json', groupName, function () {
                      suite.execute('group delete %s --quiet --json', destinationGroupName, function () {
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

      it('should work with multiple resource Ids', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var destinationGroupName = suite.generateId('xTestResource2', createdGroups, suite.isMocked);
        var resourceName1 = suite.generateId('xTestGrpRes1', createdResources, suite.isMocked);
        var resourceName2 = suite.generateId('xTestGrpRes2', createdResources, suite.isMocked);
        
        suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);
          
          //create sample resource1 to move
          suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName1, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName1 + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);
            
            //create sample resource2 to move
            suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName2, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName2 + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
              result.exitStatus.should.equal(0);

              //get the resource1 id
              suite.execute('resource show %s %s %s %s --json', groupName, resourceName1, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                showResult.exitStatus.should.equal(0);
                var resourceId1 = JSON.parse(showResult.text).id;
                
                //get the resource2 id
                suite.execute('resource show %s %s %s %s --json', groupName, resourceName2, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                  showResult.exitStatus.should.equal(0);
                  var resourceId2 = JSON.parse(showResult.text).id;

                  //perform move to destination group
                  suite.execute('group create %s --location %s --json', destinationGroupName, testGroupLocation, function (result) {
                    var commandToMove = util.format('resource move -i %s,%s -d %s -q',
                      resourceId1, resourceId2, destinationGroupName);

                    suite.execute(commandToMove, function (moveResult) {
                      moveResult.exitStatus.should.equal(0);
                      
                      //validate move was successful
                      suite.execute('resource list -g %s --json', destinationGroupName, function (listResult) {
                        listResult.exitStatus.should.equal(0);
                        var results = JSON.parse(listResult.text);
                        results.length.should.equal(2);

                        suite.execute('group delete %s --quiet --json', groupName, function () {
                          suite.execute('group delete %s --quiet --json', destinationGroupName, function () {
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
      });

      it('should work with api version provided', function (done) {
          var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
          var destinationGroupName = suite.generateId('xTestResource2', createdGroups, suite.isMocked);
          var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
          var apiVersion = '2016-02-01'; 
          suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
              result.exitStatus.should.equal(0);
              
              //create sample resource to move
              suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
                  result.exitStatus.should.equal(0);
                  
                  //get the resource id
                  suite.execute('resource show %s %s %s %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                      showResult.exitStatus.should.equal(0);
                      var resourceId = JSON.parse(showResult.text).id;
                      
                      //perform move to destination group
                      suite.execute('group create %s --location %s --json', destinationGroupName, testGroupLocation, function (result) {
                          suite.execute('resource move -i %s -d %s -o %s -q', resourceId, destinationGroupName, apiVersion, function (moveResult) {
                              moveResult.exitStatus.should.equal(0);
                              
                              //validate move was successful
                              suite.execute('resource show %s %s %s %s --json', destinationGroupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                                  showResult.exitStatus.should.equal(0);
                                  suite.execute('group delete %s --quiet --json', groupName, function () {
                                      suite.execute('group delete %s --quiet --json', destinationGroupName, function () {
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

      it('should default to valid api version when incorrect format', function (done) {
          var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
          var destinationGroupName = suite.generateId('xTestResource2', createdGroups, suite.isMocked);
          var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
          var apiVersion = '01/02/2013'; 
          suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
              result.exitStatus.should.equal(0);
              
              //create sample resource to move
              suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
                  result.exitStatus.should.equal(0);
                  
                  //get the resource id
                  suite.execute('resource show %s %s %s %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                      showResult.exitStatus.should.equal(0);
                      var resourceId = JSON.parse(showResult.text).id;
                      
                      //perform move to destination group
                      suite.execute('group create %s --location %s --json', destinationGroupName, testGroupLocation, function (result) {
                          suite.execute('resource move -i %s -d %s -o %s -q', resourceId, destinationGroupName, apiVersion, function (moveResult) {
                              moveResult.exitStatus.should.equal(0);
                              
                              //validate move was successful
                              suite.execute('resource show %s %s %s %s --json', destinationGroupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
                                  showResult.exitStatus.should.equal(0);
                                  suite.execute('group delete %s --quiet --json', groupName, function () {
                                      suite.execute('group delete %s --quiet --json', destinationGroupName, function () {
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

    //Tracking: RD Bug 1713476: failed to set configure app settings
    //describe('set', function () {
    //  it('should set the appsettings of a website resource', function(done) {
    //    var groupName = suite.generateId('xTestResourceSet', createdGroups, suite.isMocked);
    //    var resourceName = suite.generateId('xTestGrpResSet', createdResources, suite.isMocked);
    //    var parentRsrc = resourceName + '/web';
    //    var resourceNameWeb = resourceName + '';
    //    suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
    //      result.exitStatus.should.equal(0);
    //
    //      suite.execute('resource create -g %s -n %s -r %s -l %s -o %s -p %s --json', groupName, resourceName, 'Microsoft.Web/sites', testGroupLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Standard", "ComputeMode": "Limited", "workerSize" : "0", "sku" : "Free", "hostingplanName" : "xTestHostingplan1" }', function (result) {
    //        result.exitStatus.should.equal(0);
    //
    //        //Make a change to appsettings property of web config
    //        suite.execute('resource set -g %s -n %s -r %s -o %s -p %s --json', groupName, parentRsrc, 'Microsoft.Web/sites' , testApiVersion, '{"appSettings": [{"name": "testname1", "value": "testvalue1"}]}', function (setResult) {
    //          setResult.exitStatus.should.equal(0);
    //
    //          suite.execute('resource show -g %s -n %s -r %s -o %s --json', groupName, parentRsrc , 'Microsoft.Web/sites', testApiVersion, function (showResult) {
    //            showResult.exitStatus.should.equal(0);
    //            
    //            //Search for appSettings name=testname1, value=tesvalue1 to make sure resource set did work
    //            var resource = JSON.parse(showResult.text);
    //            resource.properties.appSettings[0].name.should.be.equal('testname1');
    //            resource.properties.appSettings[0].value.should.be.equal('testvalue1');
    //
    //            //Search for appSettings name=testname1, value=tesvalue1 to make sure resource set did work
    //            var resource = JSON.parse(showResult.text);
    //            resource.properties.appSettings[0].name.should.be.equal('testname1');
    //            resource.properties.appSettings[0].value.should.be.equal('testvalue1');
    //
    //            suite.execute('group delete %s --quiet --json', groupName, function () {
    //              done();
    //            });
    //          });
    //        });
    //      });
    //    });
    //  });
    //});
  });
});