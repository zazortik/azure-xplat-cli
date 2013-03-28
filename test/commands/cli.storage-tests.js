/**
* Copyright 2012 Microsoft Corporation
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

var should = require('should');
var uuid = require('node-uuid');
var utils = require('../../lib/utils');
var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var storageNamesPrefix = 'clistorage';
var storageNames = [];

var suiteUtil;
var testPrefix = 'cli.storage-tests';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
}

describe('cli', function () {
  describe('storage', function () {
    before(function (done) {
      suiteUtil = new MockedTestUtils(testPrefix);

      if (suiteUtil.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(done);
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(done);
    });

    afterEach(function (done) {
      function deleteUsedStorage (storages) {
        if (storages.length > 0) {
          var storage = storages.pop();

          var cmd = ('node cli.js account storage delete ' + storage + ' --json').split(' ');
          executeCmd(cmd, function (result) {
            deleteUsedStorage(storages);
          });
        } else {
          suiteUtil.teardownTest(done);
        }
      };

      // Remove any existing repository hooks
      deleteUsedStorage(storageNames.slice(0));
    });

    it('should create a storage account', function(done) {
      var storageName = suiteUtil.generateId(storageNamesPrefix, storageNames);

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('West US');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should list storage accounts', function(done) {
      var storageName = suiteUtil.generateId(storageNamesPrefix, storageNames);

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('West US');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        var cmd = ('node cli.js account storage list --json').split(' ');
        executeCmd(cmd, function (result) {
          var storageAccounts = JSON.parse(result.text);
          storageAccounts.some(function (account) {
            return account.ServiceName === storageName;
          }).should.be.true;

          done();
        });
      });
    });

    it('should update storage accounts', function(done) {
      var storageName = suiteUtil.generateId(storageNamesPrefix, storageNames);

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('West US');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        var cmd = ('node cli.js account storage update ' + storageName + ' --label test --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          var cmd = ('node cli.js account storage show ' + storageName + ' --json').split(' ');
          executeCmd(cmd, function (result) {
            var storageAccount = JSON.parse(result.text);
            new Buffer(storageAccount.StorageServiceProperties.Label, 'base64').toString('ascii').should.equal('test');

            done();
          });
        });
      });
    });

    it('should renew storage keys', function(done) {
      var storageName = suiteUtil.generateId(storageNamesPrefix, storageNames);

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('West US');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        var cmd = ('node cli.js account storage keys list ' + storageName + ' --json').split(' ');
        executeCmd(cmd, function (result) {
          var storageAccountKeys = JSON.parse(result.text);
          storageAccountKeys.Primary.should.not.be.null;
          storageAccountKeys.Secondary.should.not.be.null;

          var cmd = ('node cli.js account storage keys renew ' + storageName + ' --primary --json').split(' ');
          executeCmd(cmd, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });
  });
});