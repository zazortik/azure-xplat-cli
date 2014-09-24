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

var azure = require('azure');
var should = require('should');
var fs = require('fs');
var azureCommon = require('azure-common');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.storage.table-tests';
var crypto = require('crypto');

function stripAccessKey(connectionString) {
  return connectionString.replace(/AccountKey=[^;]+/, 'AccountKey=null');
}

var requiredEnvironment = [
  { name: 'AZURE_STORAGE_CONNECTION_STRING', secure: stripAccessKey }
];

/**
* Convert a cmd to azure storge cli
*/
describe('cli', function () {
  describe('storage', function() {

    before(function (done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.skipSubscription = true;

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

    describe('table', function() {
      var tableName = 'storageclitesttable';
      describe('create', function() {
        it('should create a new table', function(done) {
          suite.execute('storage table create %s --json', tableName, function(result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });

      describe('list', function() {
        it('should list all storage tables', function(done) {
            suite.execute('storage table list --json', function (result) {
              var tables = JSON.parse(result.text);
              tables.length.should.greaterThan(0);
              tables.forEach(function(table) {
                table.name.length.should.greaterThan(0);
              });
              done();
            });
        });
      });

      describe('show', function() {
        it('should show details of the specified table', function(done) {
            suite.execute('storage table show %s --json', tableName, function (result) {
              result.errorText.should.be.empty;
              done();
          });
        });
      });
      
      describe('sas', function () {
        it('should create the container sas', function (done) {
          var expiry = azureCommon.date.minutesFromNow(5).toISOString();
          suite.execute('storage table sas create %s rau %s --json', tableName, expiry, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;
            done();
          });
        });
      });

      describe('delete', function() {
        it('should delete the specified table', function(done) {
          suite.execute('storage table delete %s -q --json',tableName,function(result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });
    });

  });
});
