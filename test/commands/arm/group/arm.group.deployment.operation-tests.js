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
var path = require('path');
var CLITest = require('../../../framework/arm-cli-test');
var testUtil = require('../../../util/util');

var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' }
];

var testprefix = 'arm-cli-deployment-operation-tests';
var createdGroups = [];
var createdDeployments = [];
var cleanedUpGroups = 0;

describe('arm', function () {
  describe('deployment', function () {
    describe('operation', function () {
      var suite;
      var testLocation;
      var normalizedTestLocation;
      var originalSetTimeout = setTimeout;
      
      before(function (done) {
        suite = new CLITest(this, testprefix, requiredEnvironment);
        if (suite.isPlayback()) {
          setTimeout = function (action, timeout) {
            process.nextTick(action);
          };
        }
        suite.setupSuite(done);
      });
      
      after(function (done) {
        if (suite.isPlayback()) {
          setTimeout = originalSetTimeout;
        }
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
      
      function cleanup(done) {
        function deleteGroups(index, callback) {
          if (index === createdGroups.length) {
            return callback();
          }
          suite.execute('group delete %s --quiet -vv', createdGroups[index], function () {
            deleteGroups(index + 1, callback);
          });
        }
        
        deleteGroups(cleanedUpGroups, function () {
          cleanedUpGroups = createdGroups.length;
          done();
        });
      }
      
      function setUniqParameterNames(suite, filename) {
        //no need to create unique parameter values in playbackmode
        var deploymentParameters = JSON.parse(fs.readFileSync(filename).toString());
        if (deploymentParameters.parameters) {
          deploymentParameters = deploymentParameters.parameters;
        }
        var siteName = suite.generateId('xDeploymentTestSite1', [], suite.isMocked);
        var hostingPlanName = suite.generateId('xDeploymentTestHost2', [], suite.isMocked);
        deploymentParameters.siteName.value = siteName;
        deploymentParameters.hostingPlanName.value = hostingPlanName;
        if (!suite.isPlayback()) {
          fs.writeFileSync(filename, JSON.stringify(deploymentParameters, null, 2));
        }
      }
      
      describe('list', function () {
        it('should work properly', function (done) {
          var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
          setUniqParameterNames(suite, parameterFile);
          var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
          var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
          var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
          var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s --json',
            templateFile, groupName, deploymentName, parameterFile);
          
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute(commandToCreateDeployment, function (result) {
              result.exitStatus.should.equal(0);
              
              suite.execute('group deployment show -g %s -n %s --json', groupName, deploymentName, function (showResult) {
                showResult.exitStatus.should.equal(0);
                showResult.text.indexOf(deploymentName).should.be.above(-1);
                
                suite.execute('group deployment operation list -g %s -n %s --json', groupName, deploymentName, function (listResult) {
                  listResult.exitStatus.should.equal(0);
                  if (JSON.parse(listResult.text).length !== 0) {
                    listResult.text.indexOf(deploymentName).should.be.above(-1);
                    listResult.text.indexOf('Succeeded').should.be.above(-1);
                    listResult.text.indexOf('OK').should.be.above(-1);
                    listResult.text.indexOf('statusCode').should.be.above(-1);
                    listResult.text.indexOf('targetResource').should.be.above(-1);
                  }
                  cleanup(done);
                });
              });
            });
          });
        });
      });
    });
  });
});