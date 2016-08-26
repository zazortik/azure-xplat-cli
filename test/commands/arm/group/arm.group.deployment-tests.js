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
var jsonminify = require('jsonminify');
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
    
    function setUniqParameterNames(suite, filename, writeComment) {
            //no need to create unique parameter values in playbackmode
      if(writeComment && !suite.isPlayback()){
        fs.appendFile(filename, '//Single Line Comment \n /*A \n Multiline \n Comment */' , function(err) {
            if (err) throw err;
                console.log('Added single and multiline comments to file ', filename);
            });
      }
      var deploymentParameters = JSON.parse(JSON.minify(fs.readFileSync(filename).toString()));
      if (deploymentParameters.parameters) {
        deploymentParameters = deploymentParameters.parameters;
      }
      
      if (filename.indexOf('nested') > -1) {
        var storageAccountName = suite.generateId('sdkdeploymenttest', [], suite.isMocked);
        deploymentParameters.StorageAccountName.value = storageAccountName;
      } else {
        var siteName = suite.generateId('xDeploymentTestSite1', [], suite.isMocked);
        var hostingPlanName = suite.generateId('xDeploymentTestHost2', [], suite.isMocked);
        deploymentParameters.siteName.value = siteName;
        deploymentParameters.hostingPlanName.value = hostingPlanName;
      }
      
      if (!suite.isPlayback()) {
        fs.writeFileSync(filename, JSON.stringify(deploymentParameters, null, 2));
      }
    }
        
    function thirtyMinutesFromNow(){
      var date = new Date();
      date.setMinutes(date.getMinutes() + 30);
      var expireTime = date.toISOString().split(":").splice(0, 2);
      expireTime = expireTime.join(":") + '-07:00';
      return expireTime;
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
              var deployment = JSON.parse(showResult.text);
              deployment.name.should.equal(deploymentName);
              deployment.id.should.containEql('/resourceGroups/' + groupName);

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
            var deployment = JSON.parse(result.text);
            deployment.name.should.equal(deploymentName);
            deployment.id.should.containEql('/resourceGroups/' + groupName);
            
            suite.execute('group deployment stop -g %s -n %s -q --json', groupName, deploymentName, function (listResult) {
              listResult.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });
      });
      it('should work with URI containing SAS token', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var storageAccountName = suite.generateId('xstorageaccount', createdGroups, suite.isMocked);
        var storageContainerName = suite.generateId('xstoragecontainer', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        //same content like path.join(__dirname, '../../../data/arm-deployment-template.json')
        //var templateUri = 'http://azuresdkcitest.blob.core.windows.net/azure-cli-test/arm-deployment-template.json';
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var CreateStorageAccount = util.format('storage account create -g %s --sku-name LRS --kind Storage %s --location %s --json', groupName, storageAccountName, 'eastus');
        var GetKeyString = util.format('storage account keys list %s -g %s --json', storageAccountName, groupName);
        //var oCreateDeployment = util.format('group deployment create --template-uri %s -g %s -n %s -e %s --nowait --json',
            //templateUri, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute(CreateStorageAccount, function (storageResult) {
            storageResult.exitStatus.should.equal(0);

            suite.execute(GetKeyString, function (keyResult) {
              var key = JSON.parse(keyResult.text)[0].value;
              keyResult.exitStatus.should.equal(0);

              suite.execute('storage container create --container %s -a %s -k %s -p Off --json', storageContainerName, storageAccountName, key, function (containerResult) {
                containerResult.exitStatus.should.equal(0);

                suite.execute('storage blob upload --container %s -f %s -a %s -k %s --json', storageContainerName, templateFile, storageAccountName, key, function (templateResult) { 
                  templateResult.exitStatus.should.equal(0);
                  var expireTime = thirtyMinutesFromNow();

                  suite.execute('storage blob sas create --container %s --blob arm-deployment-template.json --permissions r --expiry %s -a %s -k %s --json', storageContainerName, expireTime, storageAccountName, key, function (SASResult) { 
                    var URIwithSAS = JSON.parse(SASResult.text).url;
                    SASResult.exitStatus.should.equal(0);                          
                    // This URIwithSAS was generated on the recorded test if a new test is generated then this variable should be replaced with 
                    // the new URIwithSAS created in that recorded session. The reason is nock will record requests with the expiration time
                    // set to thiry minutes after the SAS token generation relative to the time the test was recorded.
                    URIwithSAS = 'https://xstorageaccount4917.blob.core.windows.net/xstoragecontainer6712/arm-deployment-template.json?se=2016-08-27T02%3A02%3A00Z&sp=r&sv=2015-04-05&sr=b&sig=HjRq7q8o23pXnCyix2ZAJHXPLiuWB5ktibPQn%2FizoKw%3D';

                    suite.execute('group deployment create --template-uri %s -g %s -n %s -e %s --nowait --json', URIwithSAS, groupName, deploymentName, parameterFile, function (deployResult) { 
                      deployResult.exitStatus.should.equal(0);
                      var deployment = JSON.parse(deployResult.text);
                      deployment.name.should.equal(deploymentName);
                      deployment.id.should.containEql('/resourceGroups/' + groupName);
     
                      suite.execute('group deployment stop -g %s -n %s -q --json', groupName, deploymentName, function (listResult) {
                        listResult.exitStatus.should.equal(0);
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

      it('should successfully derive name from URI with SAS token', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var storageAccountName = suite.generateId('xstorageaccount', createdGroups, suite.isMocked);
        var storageContainerName = suite.generateId('xstoragecontainer', createdGroups, suite.isMocked);
        var deploymentName = 'arm-deployment-template';
        //same content like path.join(__dirname, '../../../data/arm-deployment-template.json')
        //var templateUri = 'http://azuresdkcitest.blob.core.windows.net/azure-cli-test/arm-deployment-template.json';
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var CreateStorageAccount = util.format('storage account create -g %s --sku-name LRS --kind Storage %s --location %s --json', groupName, storageAccountName, 'eastus');
        var GetKeyString = util.format('storage account keys list %s -g %s --json', storageAccountName, groupName);
        //var oCreateDeployment = util.format('group deployment create --template-uri %s -g %s -n %s -e %s --nowait --json',
            //templateUri, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute(CreateStorageAccount, function (storageResult) {
            storageResult.exitStatus.should.equal(0);

            suite.execute(GetKeyString, function (keyResult) {
              var key = JSON.parse(keyResult.text)[0].value;
              keyResult.exitStatus.should.equal(0);

              suite.execute('storage container create --container %s -a %s -k %s -p Off --json', storageContainerName, storageAccountName, key, function (containerResult) {
                containerResult.exitStatus.should.equal(0);

                suite.execute('storage blob upload --container %s -f %s -a %s -k %s --json', storageContainerName, templateFile, storageAccountName, key, function (templateResult) { 
                  templateResult.exitStatus.should.equal(0);
                  var expireTime = thirtyMinutesFromNow();

                  suite.execute('storage blob sas create --container %s --blob arm-deployment-template.json --permissions r --expiry %s -a %s -k %s --json', storageContainerName, expireTime, storageAccountName, key, function (SASResult) { 
                    var URIwithSAS = JSON.parse(SASResult.text).url;
                    SASResult.exitStatus.should.equal(0);     
                    // This URIwithSAS was generated on the recorded test if a new test is generated then this variable should be replaced with 
                    // the new URIwithSAS created in that recorded session. The reason is nock records the requests with the expiration time 
                    // set to thiry minutes after the SAS token generation relative to the time the test was recorded.
                    URIwithSAS = 'https://xstorageaccount714.blob.core.windows.net/xstoragecontainer9648/arm-deployment-template.json?se=2016-08-27T02%3A34%3A00Z&sp=r&sv=2015-04-05&sr=b&sig=H%2B3Fx10IynilQ4hssMCwOlIjmYiBGIUOzGey3pJ5ATI%3D';

                    suite.execute('group deployment create --template-uri %s -g %s -e %s --nowait --json', URIwithSAS, groupName, parameterFile, function (deployResult) { 
                      deployResult.exitStatus.should.equal(0);
                      var deployment = JSON.parse(deployResult.text);
                      deployment.name.should.equal(deploymentName);
                      deployment.id.should.containEql('/resourceGroups/' + groupName);
     
                      suite.execute('group deployment stop -g %s -n %s -q --json', groupName, deploymentName, function (listResult) {
                        listResult.exitStatus.should.equal(0);
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


      it('should all work with a local file', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s -m Complete -d All -q --json',
            templateFile, groupName, deploymentName, parameterFile);
        var templateContent = JSON.parse(testUtil.stripBOM(fs.readFileSync(templateFile)));
        var outputTextToValidate = Object.keys(templateContent.outputs)[0];

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            result.text.indexOf(outputTextToValidate).should.be.above(-1);
            
            suite.execute('group deployment template download -g %s -n %s -q', groupName, deploymentName, function (result) {
              result.exitStatus.should.equal(0);
              result.text.indexOf('Deployment template downloaded to').should.be.above(-1);

              suite.execute('group deployment show -g %s -n %s --json', groupName, deploymentName, function (showResult) {
                showResult.exitStatus.should.equal(0);
                showResult.text.indexOf(deploymentName).should.be.above(-1);
                showResult.text.indexOf('Complete').should.be.above(-1);
                showResult.text.indexOf('RequestContent').should.be.above(-1);
                
                suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
                  listResult.exitStatus.should.equal(0);
                  listResult.text.indexOf(deploymentName).should.be.above(-1);
                  cleanup(done);
                });

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
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s',
            templateFile, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            result.text.indexOf('provisioning status is Succeeded').should.be.above(-1);

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

      it('should all work with a local file and v2 parameters that have comments', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parametersv2-with-comments.json');
        setUniqParameterNames(suite, parameterFile, true);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template-with-comments.json');
        var commandToCreateDeployment = util.format('group deployment create -f %s -g %s -n %s -e %s',
            templateFile, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            result.text.indexOf('provisioning status is Succeeded').should.be.above(-1);

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
            result.errorText.should.include("file does not have { siteLocation } defined.");
            cleanup(done);
          });
        });
      });

      it('should show nested error messages when deployment fails', function (done) {
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateUri = 'https://raw.githubusercontent.com/vivsriaus/armtemplates/master/testnestederror.json';
        var commandToCreateDeployment = util.format('group deployment create --template-uri %s -g %s -n %s',
            templateUri, groupName, deploymentName);

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.match(/.*Storage account name must be between 3 and 24 characters*/i);
            cleanup(done);
          });
        });
      });

      it('should show error message with line number when jsonlint parse fails', function (done) {
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        var templateUri = 'https://raw.githubusercontent.com/vivsriaus/armtemplates/master/invalidJsonTemplate.json';
        var commandToCreateDeployment = util.format('group deployment create --template-uri %s -g %s -n %s',
            templateUri, groupName, deploymentName);

        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.match(/.*Parse error on line 29*/i);
            cleanup(done);
          });
        });
      });

      it('should show nested error messages when deployments with nested templates fail', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/nestedTemplate-parameters.json');
        setUniqParameterNames(suite, parameterFile);
        var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
        var deploymentName = suite.generateId('Deploy1', createdDeployments, suite.isMocked);
        //same content like path.join(__dirname, '../../../data/arm-deployment-template.json')
        var templateUri = 'https://raw.githubusercontent.com/vivsriaus/armtemplates/master/testNestedTemplateFail.json';
        var commandToCreateDeployment = util.format('group deployment create --template-uri %s -g %s -n %s -e %s',
            templateUri, groupName, deploymentName, parameterFile);
        
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute(commandToCreateDeployment, function (result) {
            result.exitStatus.should.equal(0);
            result.text.indexOf('RequestDisallowedByPolicy').should.be.below(0);
            cleanup(done);
          });
        });
      });
    });
  });
});