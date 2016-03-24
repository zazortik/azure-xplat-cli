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

var batchAccountNamePrefix = 'armclibatch';
var batchGroupPrefix = 'armclibatchgroup';
var accountName;
var resourceGroupName;
var emptyGroupName;
var autoStorageAccountPrefix = 'armclibatch';
var autoStorageAccountName;
var location;

var requiredEnvironment = [
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'westus' },
];

var testPrefix = 'arm-cli-batch-account-tests';
var suite;
var liveOnly = process.env.NOCK_OFF ? it : it.skip;

describe('arm', function () {
  describe('batch account', function () {
    var primaryKey;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }
      
      suite.setupSuite(done);
    });
    
    after(function (done) {
      suite.teardownSuite(function () {
        if (!suite.isPlayback()) {
          // Delete all created resources and groups
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
        } else {
          done();
        }
      });
    });
    
    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_ARM_TEST_LOCATION;
        done();
      });
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should create a batch account with resource group and location', function (done) {
      accountName = suite.generateId(batchAccountNamePrefix);
      resourceGroupName = suite.generateId(batchGroupPrefix);
      
      suite.execute('group create %s --location %s --json', resourceGroupName, location, function (result) {
        result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);
        
        suite.execute('batch account create %s --resource-group %s --location %s --json', accountName, resourceGroupName, location, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
    
    it('should list batch accounts within the subscription', function (done) {
      suite.execute('batch account list --json', function (result) {
        var batchAccounts = JSON.parse(result.text);
        batchAccounts.some(function (account) {
          return account.name === accountName;
        }).should.be.true;
        done();
      });
    });
    
    it('should list batch accounts within the resource group', function (done) {
      emptyGroupName = suite.generateId(batchGroupPrefix);
    
      suite.execute('group create %s --location %s --json', emptyGroupName, location, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch account list --resource-group %s --json', resourceGroupName, function (result) {
          var batchAccounts = JSON.parse(result.text);
          batchAccounts.some(function (account) {
            return account.name === accountName;
          }).should.be.true;
          batchAccounts.every(function (account) {
            return account.resourceGroup === resourceGroupName;
          }).should.be.true;
        
          suite.execute('batch account list --resource-group %s --json', emptyGroupName, function (result) {
            batchAccounts = JSON.parse(result.text);
            batchAccounts.length.should.equal(0);
            done();
          });
        });
      });
    });
    
    it('should update batch accounts', function (done) {
      // Create storage account and get resource id
      autoStorageAccountName = suite.generateId(autoStorageAccountPrefix);
      suite.execute('storage account create %s --resource-group %s --location %s --type LRS --json', autoStorageAccountName, resourceGroupName, location, function (result) {
        result.exitStatus.should.equal(0);
          
        suite.execute('storage account show %s --resource-group %s --json', autoStorageAccountName, resourceGroupName, function (result) {
          var storageAccount = JSON.parse(result.text);

          suite.execute('batch account set %s --resource-group %s --autostorage-account-id %s --json', accountName, resourceGroupName, storageAccount.id, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);
              
            suite.execute('batch account show %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
              var batchAccount = JSON.parse(result.text);
              batchAccount.autoStorage.should.not.be.null;
              batchAccount.autoStorage.storageAccountId.should.equal(storageAccount.id);
              done();
            });
          });
        });
      });
    });
    
    it('should renew batch keys', function (done) {
      suite.execute('batch account keys list %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
        var batchAccountKeys = JSON.parse(result.text);
        batchAccountKeys.primary.should.not.be.null;
        batchAccountKeys.secondary.should.not.be.null;
        var oldPrimary = batchAccountKeys.primary;
        var oldSecondary = batchAccountKeys.secondary;
        
        suite.execute('batch account keys renew %s --resource-group %s --primary --json', accountName, resourceGroupName, function (result) {
          result.exitStatus.should.equal(0);
          
          batchAccountKeys = JSON.parse(result.text);
          batchAccountKeys.should.not.be.null;
          batchAccountKeys.primary.should.not.be.null
          oldPrimary.should.not.equal(batchAccountKeys.primary);
          oldSecondary.should.equal(batchAccountKeys.secondary);
          done();
        });
      });
    });
    
    it('should sync autostorage keys', function (done) {
      suite.execute('batch account show %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
        var batchAccount = JSON.parse(result.text);
        batchAccount.autoStorage.should.not.be.null;
        batchAccount.autoStorage.lastKeySync.should.not.be.null;
        var oldSyncTime = batchAccount.autoStorage.lastKeySync;
        
        suite.execute('batch account sync-autostorage-keys %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('batch account show %s --resource-group %s --json', accountName, resourceGroupName, function (result) {
            batchAccount = JSON.parse(result.text);
            batchAccount.autoStorage.should.not.be.null;
            oldSyncTime.should.not.equal(batchAccount.autoStorage.lastKeySync);
            done();
          });
        });
      });
    });

  });
});