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

var should = require('should');
var util = require('util');
var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');

var storageNamesPrefix = 'xcliaccount';
var storageNames = [];

var AFFINITYGROUP_NAME_PREFIX = 'xcliaffinity';
var storageLocation;
var siteLocation;

var createdAffinityGroups = [];

var requiredEnvironment = [
  { name: 'AZURE_STORAGE_TEST_LOCATION', defaultValue: 'West Europe' },
  { name: 'AZURE_STORAGE_TEST_TYPE', defaultValue: 'LRS' },
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'West Europe' }
];

var testPrefix = 'cli.storage.account-tests';
var suite;
var liveOnly = process.env.NOCK_OFF ? it : it.skip;

describe('cli', function () {
  describe('storage account', function () {
    var storageName;
    var accountType;
    var affinityGroupName;
    var primaryKey;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
    });

    after(function (done) {
      if (!suite.isMocked || suite.isRecording) {
        suite.forEachName(storageNames, 'storage account delete %s --json -q', function () {
          suite.forEachName(createdAffinityGroups, 'account affinity-group delete %s --json -q', function () {
            suite.teardownSuite(done);
          });
        });
      } else {
        suite.teardownSuite(done);
      }
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        storageLocation = process.env.AZURE_STORAGE_TEST_LOCATION;
        accountType = process.env.AZURE_STORAGE_TEST_TYPE;
        siteLocation = process.env.AZURE_SITE_TEST_LOCATION;
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    it('should create a storage account with location', function(done) {
      storageName = suite.generateId(storageNamesPrefix, storageNames);

      suite.execute('storage account create %s --json --type %s --location %s',
        storageName,
        accountType,
        storageLocation,
        function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should create a storage account with affinity group', function(done) {
      storageName = suite.generateId(storageNamesPrefix, storageNames);
      affinityGroupName = suite.generateId(AFFINITYGROUP_NAME_PREFIX, createdAffinityGroups);

      suite.execute('account affinity-group create %s --location %s --description XplatCliTestArtifact --json',
        affinityGroupName,
        siteLocation,
        function (result) {

        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('storage account create %s --type %s --json -a %s',
          storageName,
          accountType,          
          affinityGroupName,
          function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          done();
        });
      });
    });

    it('should list storage accounts', function(done) {
      suite.execute('storage account list --json', function (result) {
        var storageAccounts = JSON.parse(result.text);
        storageAccounts.some(function (account) {
          return account.name === storageName;
        }).should.be.true;

        done();
      });
    });

    it('should update storage accounts', function(done) {
      suite.execute('storage account set %s --label test --json', storageName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('storage account show %s --json', storageName, function (result) {
          var storageAccount = JSON.parse(result.text);
          storageAccount.properties.label.should.equal('test');

          done();
        });
      });
    });

    it('should return true for an available storage account name', function (done) {
      var accountName = 'thisisanameforxplattest';
      suite.execute('storage account check %s --json', accountName, function (result) {
        result.exitStatus.should.equal(0);
        var availability = JSON.parse(result.text);
        availability.nameAvailable.should.be.true;
        done();
      });
    });

    it('should return false for a storage account with invalid name', function (done) {
      var accountName = 'az';
      suite.execute('storage account check %s --json', accountName, function (result) {
        result.exitStatus.should.equal(0);
        var availability = JSON.parse(result.text);
        availability.nameAvailable.should.be.false;
        availability.reason.should.equal('The name is not a valid storage account name. Storage account names must be between 3 and 24 characters in length and use numbers and lower-case letters only.');
        done();
      });
    });

    it('should return false for a storage account whose name has been taken in the subscription', function (done) {
      var accountName = 'xplat';
      suite.execute('storage account check %s --json', accountName, function (result) {
        result.exitStatus.should.equal(0);
        var availability = JSON.parse(result.text);
        availability.nameAvailable.should.be.false;
        var reason = util.format('A storage account named \'%s\' already exists in the subscription.', accountName);
        availability.reason.should.equal(reason);
        done();
      });
    });

    it('should return false for a storage account whose name has been taken in another subscription', function (done) {
      var accountName = 'azure';
      suite.execute('storage account check %s --json', accountName, function (result) {
        result.exitStatus.should.equal(0);
        var availability = JSON.parse(result.text);
        availability.nameAvailable.should.be.false;
        var reason = util.format('The storage account named \'%s\' is already taken.', accountName);
        availability.reason.should.equal(reason);
        done();
      });
    });

    liveOnly('should renew storage keys', function(done) {
      suite.execute('storage account keys list %s --json', storageName, function (result) {
        var storageAccountKeys = JSON.parse(result.text);
        storageAccountKeys.primaryKey.should.not.be.null;
        storageAccountKeys.secondaryKey.should.not.be.null;

        suite.execute('storage account keys renew %s --primary --json', storageName, function (result) {
          result.exitStatus.should.equal(0);

          storageAccountKeys = JSON.parse(result.text);
          storageAccountKeys.primaryKey.should.not.be.null;
          primaryKey = storageAccountKeys.primaryKey;
          storageAccountKeys.secondaryKey.should.not.be.null;
          done();
        });
      });
    });
    
    liveOnly('should show connecting string', function(done) {
      suite.execute('storage account connectionstring show %s --json', storageName, function(result) {
        var connectionString = JSON.parse(result.text);
        var desiredConnectionString = 'DefaultEndpointsProtocol=https;AccountName=' + storageName + ';AccountKey=' + primaryKey;
        connectionString.string.should.equal(desiredConnectionString);
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    liveOnly('should show connecting string with endpoints', function (done) {
      suite.execute('storage account connectionstring show --use-http --blob-endpoint myBlob.ep --queue-endpoint 10.0.0.10 --table-endpoint mytable.core.windows.net %s --json', storageName, function(result) {
        var connectionString = JSON.parse(result.text);
        var desiredConnectionString = 'DefaultEndpointsProtocol=http;BlobEndpoint=myBlob.ep;QueueEndpoint=10.0.0.10;TableEndpoint=mytable.core.windows.net;AccountName='+ storageName + ';AccountKey=' + primaryKey;
        connectionString.string.should.equal(desiredConnectionString);
        result.exitStatus.should.equal(0);
        done();
      });
    });
  });
});