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
var testPrefix = 'cli.vm.extension_get-chef-tests';
var vmPrefix = 'clitestvm';
var createdVms = [];
var vmCreated;
var getVM = new Object();
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmUtil = new vmTestUtil();
    var vmName,
      location,
      timeout,
      username = 'azureuser',
      password = 'PassW0rd$',
      extensionList,
      exteAylist,
      retry = 5,
      publisher = 'Chef.Bootstrap.WindowsAzure';

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
      if (suite.isMocked)
        suite.teardownSuite(done);
      else {
        vmUtil.deleteVM(vmName, timeout, suite, function() {
          suite.teardownSuite(done);
        });
      }
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('Extension:', function() {

      it('get the details of VM', function(done) {
        vmUtil.getVM(getVM, vmName, username, password, location, timeout, suite, function(vmName) {
          var cmd = util.format('vm extension get %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            extensionList = JSON.parse(result.text);
            if (extensionList.length === 0) {
              done();
            } else {
              extensionList.length.should.be.above(0);
              exteAylist = extensionList.filter(function(ex) {
                return ex.publisher == publisher;
              })[0]
              done();
            }

          });
        });
      });

      //Get Complete extension output
      it('get chef extension output', function(done) {
        vmUtil.getVM(getVM, vmName, username, password, location, timeout, suite, function(vmName) {
          var cmd = util.format('vm extension get-chef --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var ext = JSON.parse(result.text);
            if (ext.length === 0) {
              done();
            } else {
              ext.length.should.be.above(0);
              ext[0].name.should.equal(exteAylist.name);
              ext[0].publisher.should.equal(exteAylist.publisher);
              ext[0].referenceName.should.equal(exteAylist.referenceName);
              done();
            }
          });
        });
      });
    });
  });
});
