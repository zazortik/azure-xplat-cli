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
var testPrefix = 'cli.vm.acl-tests';
var createdVms = [];

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
      retry = 5;
    testUtils.TIMEOUT_INTERVAL = 5000;

    var order = 1,
      action = 'permit',
      remotesubnet = '23.99.18.228/31',
      description = "testing description",
      neworder = 2;

    var publicport = '26',
      localoport = '26',
      vmEndpointName = 'Endpt',
      protocol = 'tcp',
      idletimeout = '15',
      probeport = '4333',
      probeprotocol = 'http',
      probPathName = '/prob/listner1',
      lbSetName = 'LbSetTest',
      dirctserverreturn = 'Enabled';

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
      setTimeout(function() {
        suite.teardownTest(done);
      }, timeout);
    });

    describe('ACL :', function() {
      it('Create', function(done) {
        vmUtil.createLinuxVM(vmName, username, password, location, timeout, suite, function() {
          vmUtil.createVMEndPt(vmName, publicport, localoport, vmEndpointName, protocol, idletimeout, probeport, probeprotocol, probPathName, lbSetName, dirctserverreturn, timeout, suite, function() {
            var cmd = util.format('vm endpoint acl-rule create %s %s %s %s %s -r %s --json', vmName, vmEndpointName, order, action, remotesubnet, description).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('list an ACL rule for a VM endpoint', function(done) {
        var cmd = util.format('vm endpoint acl-rule list %s %s --json',
          vmName, vmEndpointName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var publicipList = JSON.parse(result.text);
          publicipList[0].order.should.not.be.null;
          setTimeout(done, timeout);
        });
      });

      it('Set an ACL rule for a VM endpoint', function(done) {
        var cmd = util.format('vm endpoint acl-rule set %s %s %s -w %s --json', vmName, vmEndpointName, order, neworder).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });

      it('Delete an ACL rule for a VM endpoint', function(done) {
        var cmd = util.format('vm endpoint acl-rule delete %s %s %s --quiet --json', vmName, vmEndpointName, neworder).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

  });
});
