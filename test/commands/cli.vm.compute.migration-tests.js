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
var util = require('util');
var fs = require('fs');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'cliVmMigr';
var createdVms = [];
var testPrefix = 'cli.vm.compute.migration-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

describe('cli', function() {
  describe('vm', function() {
    var customVmName;
    var fileName = 'customdata',
      certFile,
      timeout,
      location,
      retry,
      vmsize = 'Small',
      sshPort = '223',
      username = 'azureuser';
    testUtils.TIMEOUT_INTERVAL = 5000;
    var vmUtil = new vmTestUtil();

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        customVmName = suite.generateId(vmPrefix, createdVms);
        certFile = process.env.SSHCERT;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        retry = 5;
        done();
      });
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
      });
    });

    describe('migration', function() {
      it('negative tests on compute deployment migration should pass', function(done) {
        var rn = '123';
        var cmd = util.format('compute deployment prepare-migration %s %s %s %s %s %s --json --verbose', rn, rn, rn, rn, rn, rn).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(1);
          result.text.should.containEql('The deployment name \'' + rn + '\' does not exist.');
          var cmd = util.format('compute deployment commit-migration %s %s --json --verbose', rn, rn).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(1);
            result.text.should.containEql('The deployment name \'' + rn + '\' does not exist.');
            var cmd = util.format('compute deployment abort-migration %s %s --json --verbose', rn, rn).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(1);
              result.text.should.containEql('The deployment name \'' + rn + '\' does not exist.');
              done();
            });
          });
        });
      });
    });

    describe('migration', function() {
      it('negative tests on network deployment migration should pass', function(done) {
        var rn = '123';
        var cmd = util.format('network vnet prepare-migration %s --json --verbose', rn).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(1);
          result.text.should.containEql('The virtual network ' + rn + ' does not exist.');
          var cmd = util.format('network vnet commit-migration %s --json --verbose', rn).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(1);
            result.text.should.containEql('The virtual network ' + rn + ' does not exist.');
            var cmd = util.format('network vnet abort-migration %s --json --verbose', rn).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(1);
              result.text.should.containEql('The virtual network ' + rn + ' does not exist.');
              done();
            });
          });
        });
      });
    });

  });
});