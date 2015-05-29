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
var fs = require('fs');
var azureCommon = require('azure-common');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.storage.queue-tests';
var crypto = require('crypto');

function stripAccessKey(connectionString) {
  return connectionString.replace(/AccountKey=[^;]+/, 'AccountKey=null');
}

function fetchAccountName(connectionString) {
  return connectionString.match(/AccountName=[^;]+/)[0].split('=')[1];
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
      suite = new CLITest(this, testPrefix, requiredEnvironment);
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

    describe('queue', function() {
      var queueName = 'storageclitestqueue';
      describe('create', function() {
        it('should create a new queue', function(done) {
          suite.execute('storage queue create %s --json', queueName, function(result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });

      describe('list', function() {
        it('should list all storage queues', function(done) {
            suite.execute('storage queue list --json', function (result) {
            var queues = JSON.parse(result.text);
            queues.length.should.greaterThan(0);
            queues.forEach(function (queue) {
              queue.name.length.should.greaterThan(0);
            });
            done();
          });
        });
      });

      describe('stored access policy', function () {
        var policyName1 = 'queuepolicy01';
        var policyName2 = 'queuepolicy02';
        var start = new Date('2014-12-01').toISOString();
        var expiry = new Date('2099-12-31').toISOString();
        var permissions = 'au';

        it('should create the queue policy with list permission', function (done) {
          suite.execute('storage queue policy create %s %s --permissions %s --start %s --expiry %s --json', queueName, policyName1, permissions, start, expiry, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);

            var found = false;
            for (var index in policies) {
              if (policies[index].Id === policyName1) {
                found = true;
                break;
              }
            }
            found.should.be.true;
            done();
          });
        });

        it('should show the created policy', function (done) {
          suite.execute('storage queue policy show %s %s --json', queueName, policyName1, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);

            var policy;
            for (var index in policies) {
              policy = policies[index];
              if (policy.Id === policyName1) {
                break;
              }
            }
            policy.Id.should.equal(policyName1);
            policy.AccessPolicy.Permissions.should.equal(permissions);
            policy.AccessPolicy.Start.should.equal(start);
            policy.AccessPolicy.Expiry.should.equal(expiry);
            done();
          });
        });

        it('should list the policies', function (done) {
          suite.execute('storage queue policy create %s %s --permissions %s --start %s --expiry %s --json', queueName, policyName2, permissions, start, expiry, function (result) {
            suite.execute('storage queue policy list %s --json', queueName, function (result) {
              var policies = JSON.parse(result.text);
              policies.length.should.equal(2);
              done();
            });
          });
        });

        it('should set the policy', function (done) {
          var newPermissions = 'raup';
          var newStart = new Date('2015-12-01').toISOString();
          var newExpiry = new Date('2100-12-31').toISOString();
          suite.execute('storage queue policy set %s %s --permissions %s --start %s --expiry %s --json', queueName, policyName1, newPermissions, newStart, newExpiry, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);

            var policy;
            for (var index in policies) {
              policy = policies[index];
              if (policy.Id === policyName1) {
                break;
              }
            }
            policy.Id.should.equal(policyName1);
            policy.AccessPolicy.Permissions.should.equal(newPermissions);
            policy.AccessPolicy.Start.should.equal(newStart);
            policy.AccessPolicy.Expiry.should.equal(newExpiry);
            done();
          });
        });

        it('should delete the policy', function (done) {
          suite.execute('storage queue policy delete %s %s --json', queueName, policyName1, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);
            done();
          });
        });
      });
      
      describe('sas', function () {
        it('should create the queue sas and show the queue with sas', function (done) {
          var expiry = azureCommon.date.minutesFromNow(5).toISOString();
          suite.execute('storage queue sas create %s rau %s --json', queueName, expiry, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage queue show %s -a %s --sas %s --json', queueName, account, sas.sas, function (showResult) {
                showResult.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });
      });

      describe('show', function() {
        it('should show details of the specified queue', function(done) {
            suite.execute('storage queue show %s --json', queueName, function (result) {
              result.errorText.should.be.empty;
              done();
          });
        });
      });

      describe('delete', function() {
        it('should delete the specified queue', function(done) {
          suite.execute('storage queue delete %s -q --json',queueName,function(result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });
    });

  });
});
