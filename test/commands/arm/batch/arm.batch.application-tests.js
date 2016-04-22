//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
'use strict';

var should = require('should');
var utils = require('../../../../lib/util/utils');
var CLITest = require('../../../framework/arm-cli-test');
var path = require('path');

var batchAccountNamePrefix = 'armclibatch';
var batchAccountAppNamePrefix = 'armclibatchapp';
var batchGroupPrefix = 'armclibatchgroup';
var accountName;
var applicationName;
var resourceGroupName;
var emptyGroupName;
var autoStorageAccountPrefix = 'armclibatch';
var autoStorageAccountName;
var location;

var requiredEnvironment = [
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'westus' },
];

var testPrefix = 'arm-cli-batch-application-tests';
var suite;
var liveOnly = process.env.NOCK_OFF ? it : it.skip;
var storageAccount;

describe('arm', function () {
  describe('batch application', function () {

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(function () {
        location = process.env.AZURE_ARM_TEST_LOCATION;
        autoStorageAccountName = suite.generateId(autoStorageAccountPrefix);
        accountName = suite.generateId(batchAccountNamePrefix);
        resourceGroupName = suite.generateId(batchGroupPrefix);

        if (!suite.isPlayback()) {
          suite.execute('group create %s --location %s --json', resourceGroupName, location, function (result) {
            result.text.should.containEql('Succeeded');
            result.exitStatus.should.equal(0);

            setTimeout(function () {
              suite.execute('storage account create %s --resource-group %s --location %s --type LRS --json', autoStorageAccountName, resourceGroupName, location, function (result) {
                result.exitStatus.should.equal(0);
                  
                suite.execute('storage account show %s --resource-group %s --json', autoStorageAccountName, resourceGroupName, function (result) {
                  storageAccount = JSON.parse(result.text);
                  var storageId = storageAccount.id;
                  result.exitStatus.should.equal(0);

                  suite.execute('batch account create %s --resource-group %s --location %s --autostorage-account-id %s --json', accountName, resourceGroupName, location, storageId, function (result) {
                    result.exitStatus.should.equal(0);
                    suite.setupSuite(done);
                  });
                });
              });
            }, 5000);
          });
        } else {
          suite.setupSuite(done);
        }
      });
    });
    
    after(function (done) {
      suite.teardownSuite(function () {
        if (!suite.isPlayback()) {
          //Delete all created resources and groups
          suite.execute('storage account delete %s --resource-group %s --json -q', autoStorageAccountName, resourceGroupName, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('batch account delete %s --resource-group %s --json -q', accountName, resourceGroupName, function (result) {
              result.exitStatus.should.equal(0);
              suite.execute('group delete %s --json -q', resourceGroupName, function (result) {
                result.exitStatus.should.equal(0);
                suite.execute('group delete %s --json -q', emptyGroupName, function (result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
          done();
        } else {
          done();
        }
      });
    });
    
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should create a application to account', function (done) {
      applicationName = suite.generateId(batchAccountAppNamePrefix);
      
      suite.execute('batch application create --resource-group %s --account-name %s --application-id %s --json', resourceGroupName, accountName, applicationName, function (result) {
        result.text.should.containEql('');
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should list applications within the account', function (done) {
      suite.execute('batch application list --resource-group %s --account-name %s --json', resourceGroupName, accountName, function (result) {
        result.exitStatus.should.equal(0);
        var batchApps = JSON.parse(result.text);
        batchApps.some(function (app) {
          return app.id === applicationName;
        }).should.be.true;
        done();
      });
    });
    
    it('should get applications within the account', function (done) {
      suite.execute('batch application show --resource-group %s --account-name %s --application-id %s --json', resourceGroupName, accountName, applicationName, function (result) {
        result.exitStatus.should.equal(0);
        var batchApp = JSON.parse(result.text);
        batchApp.should.not.be.null;
        batchApp.id.should.equal(applicationName);
        batchApp.allowUpdates.should.equal(true);
        done();
      });
    });

    it('should update applications within the account', function (done) {
      suite.execute('batch application set --resource-group %s --account-name %s --application-id %s --allow-updates false --display-name test --json', resourceGroupName, accountName, applicationName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
          
        suite.execute('batch application show --resource-group %s --account-name %s --application-id %s --json', resourceGroupName, accountName, applicationName, function (result) {
          result.exitStatus.should.equal(0);
          var batchApp = JSON.parse(result.text);
          batchApp.should.not.be.null;
          batchApp.id.should.equal(applicationName);
          batchApp.allowUpdates.should.equal(false);
          batchApp.displayName.should.equal('test');
          done();
        });
      });
    });

    it('should create applications package within the application', function (done) {
      var uploadFilePath = path.resolve(__dirname, '../../../data/test.zip');
      suite.execute('batch application package create --resource-group %s --account-name %s --application-id %s --version 1.0 --package-file %s --json', resourceGroupName, accountName, applicationName, uploadFilePath, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should activate applications package within the application', function (done) {
      suite.execute('batch application package activate --resource-group %s --account-name %s --application-id %s --version 1.0 --format zip --json', resourceGroupName, accountName, applicationName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show applications package within the application', function (done) {
      suite.execute('batch application package show --resource-group %s --account-name %s --application-id %s --version 1.0 --json', resourceGroupName, accountName, applicationName, function (result) {
        result.exitStatus.should.equal(0);
        var batchApp = JSON.parse(result.text);
        batchApp.should.not.be.null;
        batchApp.id.should.equal(applicationName);
        batchApp.version.should.equal('1.0');
        batchApp.state.should.equal('active');
        batchApp.format.should.equal('zip');
        done();
      });
    });
    
    it('should list applications by TLSFE', function (done) {
      suite.execute('batch account show %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
        result.exitStatus.should.equal(0);
        var batchAcc = JSON.parse(result.text);
        var endpoint = batchAcc.accountEndpoint;
        suite.execute('batch account keys list %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
          result.exitStatus.should.equal(0);
          batchAcc = JSON.parse(result.text);
          var key = batchAcc.primary;
            
          suite.execute('batch application list-summary -a %s -k %s -u %s --json', accountName, key, 'https://' + endpoint, function (result) {
            result.exitStatus.should.equal(0);
            var batchApp = JSON.parse(result.text);
            batchApp.some(function (app) {
              if (app.id === applicationName) {
                app.should.have.property('versions').with.lengthOf(1);
                app.versions[0].should.equal( '1.0' );
                return true;
              } else {
                return false;
              }
            }).should.be.true;
            done();
          });
        });
      });
    });

    it('should show application by TLSFE', function (done) {
      suite.execute('batch account show %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
        result.exitStatus.should.equal(0);
        var batchAcc = JSON.parse(result.text);
        var endpoint = batchAcc.accountEndpoint;
        suite.execute('batch account keys list %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
          result.exitStatus.should.equal(0);
          batchAcc = JSON.parse(result.text);
          var key = batchAcc.primary;
            
          suite.execute('batch application show-summary -a %s -k %s -u %s --application-id %s --json', accountName, key, 'https://' + endpoint, applicationName, function (result) {
            result.exitStatus.should.equal(0);
            var batchApp = JSON.parse(result.text);
            batchApp.should.have.property('id', applicationName);
            batchApp.should.have.property('versions').with.lengthOf(1);
            batchApp.versions[0].should.equal( '1.0' );
            done();
          });
        });
      });
    });

    it('should delete applications package within the application', function (done) {
      suite.execute('batch application package delete --resource-group %s --account-name %s --application-id %s --version 1.0 --json -q', resourceGroupName, accountName, applicationName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
        done();
      });
    });
        
    it('should delete applications within the account', function (done) {
      suite.execute('batch application delete --resource-group %s --account-name %s --application-id %s --json -q', resourceGroupName, accountName, applicationName, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
  });
});