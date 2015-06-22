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
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.pip-tests';
var createdVms = [];

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      publicipname = 'publicip',
      username = 'azureuser',
      password = 'Collabera@01',
      retry = 5,
      timeout;
    testUtils.TIMEOUT_INTERVAL = 12000;
    var vmUtil = new vmTestUtil();

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });

    });

    after(function(done) {
      function deleteUsedVM(callback) {
        if (!suite.isPlayback()) {
          setTimeout(function() {
            var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(callback, timeout);
            });
          }, timeout);
        } else
          callback();
      }

      deleteUsedVM(function() {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      setTimeout(function() {
        suite.teardownTest(done);
      }, timeout);
    });

    describe('Public ip address :', function() {
      it('Create a VM with public ip address', function(done) {
        vmUtil.getImageName('Windows', suite, function(ImageName) {
          var cmd = util.format('vm create -i %s %s %s %s %s --json',
            publicipname, vmName, ImageName, username, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('List the public ip address set on a VM', function(done) {
        var cmd = util.format('vm public-ip list %s --json', vmName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          var publicipList = JSON.parse(result.text);
          publicipList[0].name.should.not.be.null;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Delete the public ip address set on a VM', function(done) {
        var cmd = util.format('vm public-ip delete %s %s --quiet --json', vmName, publicipname).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('vm public-ip list %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('Set a VM public IP address', function(done) {
        var cmd = util.format('vm public-ip set %s %s --json', vmName, publicipname).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('vm public-ip list %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            var publicipList = JSON.parse(result.text);
            publicipList[0].name.should.not.be.null;
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    });

  });
});
