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

var testGroupLocation = process.env['AZURE_ARM_TEST_LOCATION'];
var testResourceLocation = process.env['AZURE_ARM_TEST_RESOURCE_LOCATION'];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('resource', function () {
    var suite;
    var testApiVersion = '2014-04-01';

    before(function (done) {
      suite = new CLITest(testprefix);
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

    describe('create', function () {
      it('should work without switches', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group show %s --json', groupName, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var group = JSON.parse(showResult.text);
              group.resources.some(function (res) {
                return res.name === resourceName;
              }).should.be.true;

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });
      
      //once the resource delete for sql server works, will verify this test
      it('should work with switches', null, function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var parentResourceName = suite.generateId('xTestGrpParentRes', createdResources, suite.isMocked);
        var childResourceName = suite.generateId('xTestGrpChildRes', createdResources, suite.isMocked);
        var adminUsername = 'xtestgrpuser';
        var adminPassword = 'Pa$$word1234';
        var parentRsrc = 'servers/' + parentResourceName;
        suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          //creates the parent resource - sql server
          suite.execute('resource create -g %s -n %s -r %s -l %s -o %s -p %s --quiet --json', groupName, parentResourceName, 'Microsoft.Sql/servers', testResourceLocation, '2.0', '{"administratorLogin": "' + adminUsername + '", "administratorLoginPassword": "' + adminPassword + '"}', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group show %s --json', groupName, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var group = JSON.parse(showResult.text);
              group.resources.some(function (res) {
                return res.name === parentResourceName;
              }).should.be.true;

              //creates the child resource - sql database
              suite.execute('resource create -g %s -n %s -r %s -l %s -o %s --parent %s -p %s --quiet --json', groupName, childResourceName, 'Microsoft.Sql/servers/databases', testResourceLocation, '2.0', parentRsrc, '{"maxSizeBytes": "5368709120", "edition" : "Business", "collation": "SQL_1xcompat_CP850_CI_AS"}', function (result) {
                result.exitStatus.should.equal(0);

                suite.execute('group show %s --json', groupName, function (showResult) {
                  showResult.exitStatus.should.equal(0);

                  var group = JSON.parse(showResult.text);
                  group.resources.some(function (res) {
                    return res.name === childResourceName;
                  }).should.be.true;
                  //delete the child resource - sql database
                  suite.execute('resource delete -g %s -n %s -r %s -o %s --parent %s --quiet --json', groupName, childResourceName, 'Microsoft.Sql/servers/databases', '2.0', parentRsrc, function (deleteResult) {
                    deleteResult.exitStatus.should.equal(0);
                    //delete the parent resource - sql server
                    suite.execute('resource delete %s --quiet --json', groupName, parentResourceName, 'Microsoft.Sql/servers', '2.0', function (deleteResult) {
                      deleteResult.exitStatus.should.equal(0);
                      //delete the group
                      suite.execute('group delete %s --quiet --json', groupName, function (deleteResult) {
                        deleteResult.exitStatus.should.equal(0);
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

      it('should create the group if it does not exist', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);

        suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group show %s --json', groupName, function (showResult) {
            showResult.exitStatus.should.equal(0);

            var group = JSON.parse(showResult.text);
            group.resources.some(function (res) {
              return res.name === resourceName;
            }).should.be.true;

            suite.execute('group delete %s --quiet --json', groupName, function () {
              done();
            });
          });
        });
      });
    });

    describe('delete', function () {
      it('should work', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        
        suite.execute('group create %s --location %s --quiet --json', groupName, testResourceLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
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
    });

    describe('list', function () {
      it('should work without filters', function (done) {
        var groupName = suite.generateId('xTestResource', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpRes', createdResources, suite.isMocked);
        
        suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
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

        suite.execute('group create %s --location %s --quiet --json', groupName1, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group create %s --location %s --quiet --json', groupName2, testGroupLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName1, resourceName1, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName1 + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
              result.exitStatus.should.equal(0);

              suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName2, resourceName2, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName2 + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
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
        
        suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource show %s %s %s %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var resource = JSON.parse(showResult.text);
              resource.name.should.equal(resourceName);
              resource.location.should.equal(testResourceLocation);

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
        
        suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create %s %s %s %s %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }', function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource show -g %s -n %s -r %s -o %s --json', groupName, resourceName, 'Microsoft.Web/sites', testApiVersion, function (showResult) {
              showResult.exitStatus.should.equal(0);

              var resource = JSON.parse(showResult.text);
              resource.name.should.equal(resourceName);
              resource.location.should.equal(testResourceLocation);

              suite.execute('group delete %s --quiet --json', groupName, function () {
                done();
              });
            });
          });
        });
      });
    });

    describe('set', function () {
      it('should set the appsettings of a website resource', function(done) {
        var groupName = suite.generateId('xTestResourceSet', createdGroups, suite.isMocked);
        var resourceName = suite.generateId('xTestGrpResSet', createdResources, suite.isMocked);
        var parentRsrc = 'sites/' + resourceName;
        
        suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('resource create -g %s -n %s -r %s -l %s -o %s -p %s --quiet --json', groupName, resourceName, 'Microsoft.Web/sites', testResourceLocation, testApiVersion, '{ "Name": "' + resourceName + '", "SiteMode": "Standard", "ComputeMode": "Limited", "workerSize" : "0", "sku" : "Free", "hostingplanName" : "xTestHostingplan1", "siteLocation" : "' + testResourceLocation + '"}', function (result) {
            result.exitStatus.should.equal(0);

            //Make a change to appsettings property of web config
            suite.execute('resource set -g %s -n %s -r %s --parent %s -o %s -p %s --json', groupName, 'web', 'Microsoft.Web/sites/config', parentRsrc , testApiVersion, '{"appSettings": [{"name": "testname1", "value": "testvalue1"}]}', function (setResult) {
              setResult.exitStatus.should.equal(0);

              suite.execute('resource show -g %s -n %s -r %s --parent %s -o %s --json', groupName, 'web', 'Microsoft.Web/sites/config', parentRsrc, testApiVersion, function (showResult) {
                showResult.exitStatus.should.equal(0);
                
                //Serach for appSettings name=testname1, value=tesvalue1 to make sure resource set did work
                var resource = JSON.parse(showResult.text);
                resource.properties.appSettings[0].name.should.be.equal('testname1');
                resource.properties.appSettings[0].value.should.be.equal('testvalue1');

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
});