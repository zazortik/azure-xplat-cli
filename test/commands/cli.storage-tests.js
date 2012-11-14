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

var cli = require('../cli');
var capture = require('../util').capture;

var currentStorageName = 0;
var storageNames = [ ('storage' + uuid()).toLowerCase().substr(0, 15) ];

suite('cli', function(){
  suite('storage', function() {
    teardown(function (done) {
      function deleteUsedStorage (storages) {
        if (storages.length > 0) {
          var storage = storages.pop();

          var cmd = ('node cli.js account storage delete ' + storage + ' --json').split(' ');

          capture(function() {
            cli.parse(cmd);
          }, function () {
            deleteUsedStorage(storages);
          });
        } else {
          done();
        }
      };

      // Remove any existing repository hooks
      deleteUsedStorage(storageNames.slice(0));
    });

    test('storage create', function(done) {
      var storageName = storageNames[0];

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('East US');

      capture(function() {
        cli.parse(cmd);
      }, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    test('storage list', function(done) {
      var storageName = storageNames[0];

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('East US');

      capture(function() {
        cli.parse(cmd);
      }, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        var cmd = ('node cli.js account storage list --json').split(' ');

        capture(function() {
          cli.parse(cmd);
        }, function (result) {
          var storageAccounts = JSON.parse(result.text);
          storageAccounts.some(function (account) {
            return account.ServiceName === storageName;
          }).should.be.true;

          done();
        });
      });
    });

    test('storage update', function(done) {
      var storageName = storageNames[0];

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('East US');

      capture(function() {
        cli.parse(cmd);
      }, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        var cmd = ('node cli.js account storage update ' + storageName + ' --label test --json').split(' ');

        capture(function() {
          cli.parse(cmd);
        }, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          var cmd = ('node cli.js account storage show ' + storageName + ' --json').split(' ');

          capture(function() {
            cli.parse(cmd);
          }, function (result) {
            var storageAccount = JSON.parse(result.text);
            new Buffer(storageAccount.StorageServiceProperties.Label, 'base64').toString('ascii').should.equal('test');

            done();
          });
        });
      });
    });

    test('storage keys renew', function(done) {
      var storageName = storageNames[0];

      var cmd = ('node cli.js account storage create ' + storageName + ' --json --location').split(' ');
      cmd.push('East US');

      capture(function() {
        cli.parse(cmd);
      }, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        var cmd = ('node cli.js account storage keys list ' + storageName + ' --json').split(' ');

        capture(function() {
          cli.parse(cmd);
        }, function (result) {
          var storageAccountKeys = JSON.parse(result.text);
          storageAccountKeys.Primary.should.not.be.null;
          storageAccountKeys.Secondary.should.not.be.null;

          var cmd = ('node cli.js account storage keys renew ' + storageName + ' --primary --json').split(' ');

          capture(function() {
            cli.parse(cmd);
          }, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            var cmd = ('node cli.js account storage keys list ' + storageName + ' --json').split(' ');

            capture(function() {
              cli.parse(cmd);
            }, function (result) {
              var renewedStorageAccountKeys = JSON.parse(result.text);
              renewedStorageAccountKeys.Primary.should.not.be.null;
              renewedStorageAccountKeys.Secondary.should.not.be.null;

              renewedStorageAccountKeys.Primary.should.not.equal(storageAccountKeys.Primary);
              renewedStorageAccountKeys.Secondary.should.equal(storageAccountKeys.Secondary);

              done();
            });
          });
        });
      });
    });
  });
});