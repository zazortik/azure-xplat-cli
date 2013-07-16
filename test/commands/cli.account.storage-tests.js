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

var should = require('should');
var utils = require('../../lib/util/utils');
var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var storageNamesPrefix = 'cstorage';
var storageNames = [];

var suiteUtil;
var testPrefix = 'cli.account.storage-tests';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('cli', function () {
  describe('account storage', function () {
    var storageName;

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
      suiteUtil.teardownTest(done);
    });

    it('should create a storage account', function(done) {
      storageName = suiteUtil.generateId(storageNamesPrefix, storageNames);

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push(process.env.AZURE_STORAGE_TEST_LOCATION || 'East US');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should list storage accounts', function(done) {
      var cmd = ('node cli.js account storage list --json').split(' ');
      executeCmd(cmd, function (result) {
        var storageAccounts = JSON.parse(result.text);
        storageAccounts.some(function (account) {
          return account.ServiceName === storageName;
        }).should.be.true;

        done();
      });
    });

    it('should update storage accounts', function(done) {
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

    it('should renew storage keys', function(done) {
      var cmd = ('node cli.js account storage keys list ' + storageName + ' --json').split(' ');
      executeCmd(cmd, function (result) {
        var storageAccountKeys = JSON.parse(result.text);
        storageAccountKeys.Primary.should.not.be.null;
        storageAccountKeys.Secondary.should.not.be.null;

        var cmd = ('node cli.js account storage keys renew ' + storageName + ' --primary --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          function deleteUsedStorage (storages) {
            if (storages.length > 0) {
              var storage = storages.pop();

              var cmd = ('node cli.js account storage delete ' + storage + ' --json').split(' ');
              executeCmd(cmd, function () {
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
