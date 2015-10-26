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
// A common VM used by multiple tests
var suite;
var vmPrefix = 'clitestvm';
var createdVms = [];
var testPrefix = 'cli.vm.extension_set-custom_disable';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];
describe('cli', function() {
  describe('vm', function() {
    var vmUtil = new vmTestUtil();
    var vmName,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      retry = 5,
      customScript = 'test/data/customScript.json',
      customextension = 'CustomScriptExtension',
      custompublisher = 'Microsoft.Compute',
      customversion = '1.*',
      timeout;
    testUtils.TIMEOUT_INTERVAL = 5000;

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
      if (!suite.isPlayback()) {
        vmUtil.deleteVM(vmName, timeout, suite, function() {
          suite.teardownSuite(done);
        });
      } else {
        suite.teardownSuite(done);
      }
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      setTimeout(function() {
        suite.teardownTest(done);
      }, timeout);
    });
    //Set custom extensions
    describe('extension:', function() {
      it('should set custom extensions and disable', function(done) {
        vmUtil.createWindowsVM(vmName, username, password, location, timeout, suite, function() {
          var cmd = util.format('vm extension set -c %s %s %s %s %s --json', customScript, vmName, customextension, custompublisher, customversion).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm extension set -b %s %s %s %s --json', vmName, customextension, custompublisher, customversion).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm extension get %s --json', vmName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var Extensions = JSON.parse(result.text);
                Extensions[0].state.should.equal('Disable');
                done();
              });
            });
          });
        });
      });
    });
  });
});
