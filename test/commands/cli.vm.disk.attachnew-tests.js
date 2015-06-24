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
var vmPrefix = 'clitestvm';
var createdVms = [];
var testPrefix = 'cli.vm.disk.attachnew-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      timeout,
      cachingbehaviour = 'ReadWrite',
      retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;
    var vmUtil = new vmTestUtil();

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    after(function(done) {
      if (suite.isPlayback())
        suite.teardownSuite(done);
      else {
        vmUtil.deleteVM(vmName, timeout, suite, function() {
          suite.teardownSuite(done);
        });
      }
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

    //attaches a new disk
    describe('Disk:', function() {
      it('Attach-New', function(done) {
        vmUtil.ListDisk('Linux', location, suite, function(diskObj) {
          vmUtil.createLinuxVM(vmName, username, password, location, timeout, suite, function() {
            var domainUrl = 'http://' + diskObj.mediaLinkUri.split('/')[2];
            var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
            var cmd = util.format('vm disk attach-new --host-caching %s %s %s %s --json', cachingbehaviour, vmName, 1, blobUrl).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              vmUtil.waitForDiskOp(vmName, true, timeout, suite, function() {
                cmd = util.format('vm disk detach %s 0 --json', vmName).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  vmUtil.waitForDiskOp(vmName, false, timeout, suite, function() {
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

  });
});
