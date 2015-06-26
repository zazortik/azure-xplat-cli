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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');
var suite;
var vmPrefix = 'ClitestVm';
var testPrefix = 'cli.vm.capture-tests';
var createdVms = [];

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      certFile,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      captureImg = 'xplattestcapimg',
      timeout, retry;
    testUtils.TIMEOUT_INTERVAL = 10000;
    var vmUtil = new vmTestUtil();

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        certFile = process.env.SSHCERT;
        retry = 5;
        done();
      });
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //shutdown a vm
    describe('Vm:', function() {
      it('shutdown and capture', function(done) {
        vmUtil.createVM(certFile, vmName, username, password, location, timeout, suite, function() {
          var cmd = util.format('vm shutdown %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            setTimeout(function() {
              cmd = util.format('vm capture %s %s --json --delete', vmName, captureImg).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                setTimeout(function() {
                  cmd = util.format('service delete %s -q --json', vmName, captureImg).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                }, timeout);
              });
            }, timeout);
          });
        });
      });
    });

    // VM Capture into a disk
    describe('Captured Images:', function() {
      it('should be listed in images list and delete', function(done) {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vmImagelist = JSON.parse(result.text);
          var imagefound = false;
          imagefound = vmImagelist.some(function(imageObj) {
            if (imageObj.name === captureImg) {
              return true;
            }
          });
          imagefound.should.true;
          setTimeout(function() {
            cmd = util.format('vm image delete -b %s --json', captureImg).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(done, timeout);
            });
          }, timeout);
        });
      });
    });

  });
});
