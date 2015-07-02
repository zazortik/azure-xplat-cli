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
var _ = require('underscore');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');
var suite;
var vmPrefix = 'ClitestVm';
var testPrefix = 'cli.vm.endpoint-tests';
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
    //Variable for set command
    var publicportN = '27',
      localoportN = '27',
      vmEndpointNameN = 'EndptN',
      protocolN = 'tcp',
      idletimeoutN = '20',
      probeportN = '4444',
      probeprotocolN = 'tcp',
      probPathNameN = '/prob/listnern1',
      lbSetNameN = 'LbSetTestN',
      dirctserverreturnN = 'Disabled';
    //Variable for create-multiple command
    var publicportM1 = '28',
      localportM1 = '28'
    publicportM2 = '29', localportM2 = '29', protocolM2 = 'tcp', idletimeoutM2 = '15', probeprotocolM2 = 'http', probeportM2 = '4222', probPathNameM2 = '/prob/listner2', lbSetNameM2 = 'LbSetTest2';

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

    //create single endpoint
    describe('Endpoint:', function() {
      it('Create', function(done) {
        vmUtil.createLinuxVM(vmName, username, password, location, timeout, suite, function() {

          var cmd = util.format('vm endpoint create %s %s -k %s -n %s -o %s -m %s -t %s -r %s -p %s -b %s -u %s --json', vmName, publicport, localoport, vmEndpointName, protocol, idletimeout, probeport, probeprotocol, probPathName, lbSetName, dirctserverreturn).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            setTimeout(done, timeout);
          });
        });
      });
      it('list', function(done) {
        var cmd = util.format('vm endpoint list %s %s --json', vmName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var epList = JSON.parse(result.text);
          var epExists = epList.some(function(ep) {
            return ep.name.toLowerCase() === vmEndpointName.toLowerCase();
          });
          epExists.should.be.ok;
          done();
        });
      });
      it('set', function(done) {
        var cmd = util.format('vm endpoint set %s %s -l %s -c %s -n %s -o %s -m %s -t %s -r %s -p %s -b %s --json', vmName, vmEndpointName, publicportN, localoportN, vmEndpointNameN, protocolN, idletimeoutN, probeportN, probeprotocolN, probPathNameN, lbSetNameN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
      it('show', function(done) {
        var cmd = util.format('vm endpoint show %s %s --json', vmName, vmEndpointNameN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(vmEndpointNameN);
          done();
        });
      });
      it('create-multiple', function(done) {
        var cmd = util.format('vm endpoint create-multiple %s -c %s:%s:::::::::,%s:%s:%s:%s::%s:%s:%s:%s:: --json', vmName, publicportM1, localportM1, publicportM2, localportM2, protocolM2, idletimeoutM2, probeprotocolM2, probeportM2, probPathNameM2, lbSetNameM2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
      it('Delete', function(done) {
        var cmd = util.format('vm endpoint delete %s %s --json', vmName, vmEndpointNameN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });
  });
});
