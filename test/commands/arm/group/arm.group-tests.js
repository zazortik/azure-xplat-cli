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
var util = require('util');
var fs = require('fs')

var CLITest = require('../../../framework/arm-cli-test');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testprefix = 'arm-cli-group-tests';
var groupPrefix = 'xplatTestGCreate';
var createdGroups = [];
var createdDeployments = [];

var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' }
];

describe('arm', function () {

  describe('group', function () {
    var suite;
    var testLocation;
    var normalizedTestLocation;

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(done);     
    });

    after(function (done) {
      suite.teardownSuite(done);
    });
    
    beforeEach(function (done) {
      suite.setupTest(function () {
        testLocation = process.env.AZURE_ARM_TEST_LOCATION;
        normalizedTestLocation = testLocation.toLowerCase().replace(/ /g, '');
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('create', function () {
      it('should create empty group', function (done) {
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.properties.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });

      it('should create a group with a named deployment from a template file and a parameter file', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s -f %s -e %s -d %s --template-version %s --json',
          groupName, testLocation, templateFile, parameterFile, 'mydepTemplateFile', '1.0.0.0', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.properties.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              var results = JSON.parse(listResult.text);
              results.length.should.be.above(0);

              suite.execute('group delete %s --json --quiet', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should create a group with a named deployment from a template uri and parameter string', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        var parameterString = fs.readFileSync(parameterFile).toString().replace(/\n/g, '').replace(/\r/g, '');
        //same content like path.join(__dirname, '../../../data/arm-deployment-template.json')
        var templateUri = 'http://azuresdkcitest.blob.core.windows.net/azure-cli-test/arm-deployment-template.json';
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s --template-uri %s -p %s -d %s --template-version %s --json',
          groupName, testLocation, templateUri, parameterString, 'mydeptemplateUrl', '1.0.0.0', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.properties.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              var results = JSON.parse(listResult.text);
              results.length.should.be.above(0);

              suite.execute('group delete %s --json --quiet', groupName, function () {
                done();
              });
            });
          });
        });
      });
    });

    describe('show', function () {
      it('should show information of an empty group', function (done) {
        var groupName = suite.generateId('xplatTestGrpShow', createdGroups, suite.isMocked);
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group show %s --json', groupName, function (showResult) {
            showResult.exitStatus.should.equal(0);

            var group = JSON.parse(showResult.text);
            group.name.should.equal(groupName);
            group.resources.length.should.equal(0);
            group.properties.provisioningState.should.equal('Succeeded');
            group.permissions[0].actions[0].should.equal('*');
            group.permissions[0].notActions.length.should.equal(0);
            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });
      
    //Comment out till we add the reliable support routine to retry the "group show" on newly created group
    //  it('should show information of a group with resources created in it', function (done) {
    //    var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
    //    var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');

    //    var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);

    //    suite.execute('group create %s --location %s -f %s -e %s -d %s --template-version %s --json',
    //      groupName, testLocation, templateFile, parameterFile, 'mydepTemplateFile', '1.0.0.0', function (result) {
    //      result.exitStatus.should.equal(0);
    //      //TODO: need to wait or retry because the group will take a while to show up        
    //      suite.execute('group show %s --json', groupName, function (showResult) {
    //        showResult.exitStatus.should.equal(0);

    //        var group = JSON.parse(showResult.text);
    //        group.name.should.equal(groupName);
    //        group.properties.provisioningState.should.equal('Succeeded');
    //        group.permissions[0].actions[0].should.equal('*');
    //        group.permissions[0].notActions.length.should.equal(0);
    //        utils.stringEndsWith(group.id, groupName).should.be.true;

    //        group.resources.forEach(function (item) {
    //          item.location.should.equal(testLocation);
    //          if (item.type === 'Microsoft.Web/serverFarms') {
    //            item.name.should.equal('xDeploymentTestHost1');
    //          }
    //          else if (item.type === 'Microsoft.Web/sites') {
    //            item.name.should.equal('xDeploymentTestSite1');
    //          }
    //        });

    //        suite.execute('group list %s --details --json', groupName, function (detailListResult) {
    //          var detailGroups = JSON.parse(detailListResult.text);
    //          detailGroups[0].permissions[0].actions[0].should.equal('*');
    //          detailGroups[0].permissions[0].notActions.length.should.equal(0);
    //          utils.stringEndsWith(detailGroups[0].id, detailGroups[0].name).should.be.true;
    //          suite.execute('group delete %s --json --quiet', groupName, function () {
    //            done();
    //          });
    //        });
    //      });
    //    });
    //  });
    });

    describe('log show', function () {
      var groupName;
      var deploymentName;
      var deploymentName1;

      beforeEach(function (done) {
        if(!groupName) {
          setupForLogShow(done);
        } else {
          done();
        }
      });

      after(function (done) {
        if(!suite.isMocked || suite.isRecording) {
          cleanupForLogShow(done);
        } else {
          done();
        }
      });

      //create a group named xDeploymentTestGroup with two deployments 'Deploy1' and 'Deploy2'
      function setupForLogShow (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s --nowait --json -vv',
            templateFile, groupName, deploymentName, parameterFile);

        console.log('  . Creating setup for running group log show tests');
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            poll(1, done);
          });
        });
      }

      //Polls for the output of group log show at an interval of 20 seconds for 3 times (max).
      function poll (counter, done) {
        suite.execute('group log show -n %s -l --json', groupName, function (result) {
          result.exitStatus.should.equal(0);
          counter = counter + 1;
          if (result.text === '' && counter <= 3) {
            setTimeout(function () { poll(counter, done); }, suite.isPlayback() ? 0 : 20000);
          } else if (result.text === '' && counter >= 3) {
            throw new Error("group log show command is taking forever, bail out!!");
          } else {
            done();
          }
        });
      }

      function cleanupForLogShow (done) {
        suite.execute('group delete %s --json --quiet', groupName, function () {
          console.log('  . Performing cleanup of group log show tests')
          done();
        });
      }

      //Validates the content of Logs
      function validateLogContent (logs) {
        logs.forEach(function (item) {
          item.resourceGroupName.should.equal(groupName);
          //item.status.value.should.not.match(/^Failed$/i);
        });
      }

      it('should return logs of all the operations', function (done) {
        suite.execute('group log show -n %s --all --json', groupName, function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.be.empty;
          validateLogContent(JSON.parse(result.text));
          done();
        });
      });

      it('should return logs of the last deployment with the --last-deployment switch', function (done) {
        suite.execute('group log show -n %s --last-deployment --json', groupName, function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.be.empty;
          validateLogContent(JSON.parse(result.text));
          done();
        });
      });

      it('should return logs of the last deployment by default', function (done) {
        suite.execute('group log show -n %s --json', groupName, function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.be.empty;
          validateLogContent(JSON.parse(result.text));
          done();
        });
      });

      it('should return logs of the specified deployment', function (done) {
        suite.execute('group log show -n %s -d %s --json', groupName, deploymentName, function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.be.empty;
          validateLogContent(JSON.parse(result.text));
          done();
        });
      });

      it('should fail when an invalid resource group is provided', function (done) {
        suite.execute('group log show -n %s --json', 'random_group_name', function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.include('Resource group \'random_group_name\' could not be found.');
          done();
        });
      });

      it('should fail when an invalid deployment name is provided', function (done) {
        suite.execute('group log show -n %s -d %s --json', groupName, 'random_deployment_name', function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.include('Deployment \'random_deployment_name\' could not be found.');
          done();
        });
      });
    });
  });
});
