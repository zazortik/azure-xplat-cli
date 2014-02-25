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
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var storageNamesPrefix = 'xcli';
var storageNames = [];

var AFFINITYGROUP_NAME_PREFIX = 'xcli';
var AFFINITYGROUP_LOCATION = process.env.AZURE_SITE_TEST_LOCATION || 'West Europe';

var createdAffinityGroups = [];

var suite;
var testPrefix = 'cli.storage.account-tests';

describe('cli', function () {
  describe('storage account', function () {
    var storageName;
    var affinityGroupName;

    before(function (done) {
      suite = new CLITest(testPrefix);

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

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

    it('should create a storage account with location', function(done) {
      storageName = suite.generateId(storageNamesPrefix, storageNames);

      suite.execute('storage account create %s --json --location %s',
        storageName,
        process.env.AZURE_STORAGE_TEST_LOCATION || 'West Europe',
        function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should create a storage account with affinity group', function(done) {
      storageName = suite.generateId(storageNamesPrefix, storageNames);
      affinityGroupName = suite.generateId(AFFINITYGROUP_NAME_PREFIX, createdAffinityGroups);

      suite.execute('account affinity-group create %s --location %s --description AG-DESC --json',
        affinityGroupName,
        AFFINITYGROUP_LOCATION,
        function (result) {

        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('storage account create %s --json -a %s',
          storageName,
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

    it('should renew storage keys', function(done) {
      suite.execute('storage account keys list %s --json', storageName, function (result) {
        var storageAccountKeys = JSON.parse(result.text);
        storageAccountKeys.primaryKey.should.not.be.null;
        storageAccountKeys.secondaryKey.should.not.be.null;

        suite.execute('storage account keys renew %s --primary --json', storageName, function (result) {
          result.exitStatus.should.equal(0);

          storageAccountKeys = JSON.parse(result.text);
          storageAccountKeys.primaryKey.should.not.be.null;
          storageAccountKeys.secondaryKey.should.not.be.null;

          function deleteUsedStorage (storages) {
            if (storages.length > 0) {
              var storage = storages.pop();

              suite.execute('storage account delete %s --quiet --json', storage, function () {
                deleteUsedStorage(storages);
              });
            } else {
              done();
            }
          }

          deleteUsedStorage(storageNames);
        });
      });
    });
  });
});