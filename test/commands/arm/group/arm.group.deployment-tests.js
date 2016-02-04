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

var testprefix = 'arm-cli-deployment-tests';
var createdGroups = [];
var createdDeployments = [];
var cleanedUpGroups = 0;

describe('arm', function () {
  describe('deployment', function () {
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

    describe('list and show', function () {
      it('should work properly', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s --nowait --json',
            templateFile, groupName, deploymentName, parameterFile);

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group deployment show -g %s -n %s --json', groupName, deploymentName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              showResult.text.indexOf(deploymentName).should.be.above(-1);

              suite.execute('group deployment list -g %s --state %s --json', groupName, 'Running', function (listResult) {
                listResult.exitStatus.should.equal(0);
                if (JSON.parse(listResult.text).length !== 0) {
                  listResult.text.indexOf(deploymentName).should.be.above(-1);
                }
                cleanup(done);
              });
            });
          });
        });
      });
    });

    describe('delete', function () {
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

            suite.execute('group deployment delete -g %s -n %s -q', groupName, deploymentName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });
      });
    });

    describe('stop', function () {
      // deployment stop will not work. Autorest generated clients currently poll till a terminal state (Success, Failure) has been reached. 
      // Hence the --no-wait option switch has no effect. The client should take an optional parameter that indicates whether to poll or not.
      it('should work', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s --nowait --json',
            templateFile, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group deployment stop -g %s -n %s -q --json', groupName, deploymentName, function (listResult) {
              listResult.exitStatus.should.equal(0);
              
              cleanup(done);
            });
          });
        });
      });
           
      it('should stop the currently running deployment when deployment name is not provided and only 1 deployment is currently running', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s --nowait --json',
            templateFile, groupName, deploymentName, parameterFile);

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group deployment stop -g %s -q --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              cleanup(done);
            });
          });
        });
      });

      it('should fail when the deployment name is not provided and more than 1 deployment is currently running', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var deploymentName1 = suite.generateId('Deploy2', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s --nowait --json',
            templateFile, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('group deployment create -f %s -g %s -n %s -e %s --nowait --json -vv', templateFile, groupName, deploymentName1, parameterFile, function (result2) {
              result2.exitStatus.should.equal(0);
              suite.execute('group deployment stop -g %s -q --json', groupName, function (listResult) {
                listResult.exitStatus.should.equal(1);
                listResult.errorText.should.include('There are more than 1 deployment in either "Running" or "Accepted" state, please name one.');
                cleanup(done);
              });
            });
          });
        });
      });
    });

    describe('create', function () {
      it('should work with a remote file', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        //same content like path.join(__dirname, '../../../data/arm-deployment-template.json')
        var templateUri = 'http://azuresdkcitest.blob.core.windows.net/azure-cli-test/arm-deployment-template.json';       
        var commandToCreateDeployment = util.format('group deployment create --template-uri %s -g %s -n %s -e %s --nowait --json',
            templateUri, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group deployment stop -g %s -n %s -q --json', groupName, deploymentName, function (listResult) {
              listResult.exitStatus.should.equal(0);
              
              cleanup(done);
            });
          });
        });
      });

      it('should all work with a local file', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s -m Complete -q --json',
            templateFile, groupName, deploymentName, parameterFile);
        var templateContent = JSON.parse(testUtil.stripBOM(fs.readFileSync(templateFile)));
        var outputTextToValidate = Object.keys(templateContent.outputs)[0];

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            result.text.indexOf(outputTextToValidate).should.be.above(-1);

            suite.execute('group deployment show -g %s -n %s --json', groupName, deploymentName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              showResult.text.indexOf(deploymentName).should.be.above(-1);
              showResult.text.indexOf('Complete').should.be.above(-1);

              suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
                listResult.exitStatus.should.equal(0);
                listResult.text.indexOf(deploymentName).should.be.above(-1);
                cleanup(done);
              });
            });
          });
        });
      });
      
      it('should all work with a local file and v2 parameters', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parametersv2.json');
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
              
              suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
                listResult.exitStatus.should.equal(0);
                listResult.text.indexOf(deploymentName).should.be.above(-1);
                cleanup(done);
              });
            });
          });
        });
      });

      it('should all work with a string for parameters', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var parameters = fs.readFileSync(parameterFile).toString().replace(/\n/g, '').replace(/\r/g, '');
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');

        parameters = JSON.stringify(JSON.parse(parameters));

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('group deployment create -f %s -g %s -n %s -p %s --nowait --json -vv',
            templateFile, groupName, deploymentName, parameters, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group deployment show -g %s -n %s --json', groupName, deploymentName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              showResult.text.indexOf(deploymentName).should.be.above(-1);

              suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
                listResult.exitStatus.should.equal(0);
                listResult.text.indexOf(deploymentName).should.be.above(-1);
                cleanup(done);
              });
            });
          });
        });
      });

      it('should fail when a parameter is missing for a deployment template', function (done) {
        var parameterString = "{ \"siteName\":{\"value\":\"xDeploymentTestSite1\"}, \"hostingPlanName\":{ \"value\":\"xDeploymentTestHost1\" }, \"sku\":{ \"value\":\"Free\" }, \"workerSize\":{ \"value\":\"0\" }}";
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('group deployment create -f %s -g %s -n %s -p %s --json', templateFile, groupName, deploymentName, parameterString, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.match(/.*Deployment template validation failed.*/i);
            cleanup(done);
          });
        });
      });
    });
  });
});