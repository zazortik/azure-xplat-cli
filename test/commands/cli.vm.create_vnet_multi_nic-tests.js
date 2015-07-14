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
'use strict';

var should = require('should');
var util = require('util');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');
var testprefix = 'cli.vm.create-multi-nic-tests';
var location;
var vmPrefix = 'ClitestVmVnet',
  username = 'azureuser',
  password = 'PassW0rd$',
  vmSize = 'ExtraLarge',
  timeout, retry = 5;
testUtils.TIMEOUT_INTERVAL = 10000;
var vmImgName;
var vnetPrefix = 'CliTestVnetVm',
  vnetAddressSpace = '10.0.0.0',
  vnetCidr = '20',
  subnetPrefix = 'CliTestSubnetVm',
  subnetStartIp = '10.0.0.0',
  subnetCidr = '23';

var nicPrefix1 = 'CliTestNicVm1',
  nicPrefix2 = 'CliTestNicVm2',
  ipForwardingVal = 'Disabled';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];


describe('cli', function() {
  describe('vm', function() {
    var suite;
    var vmUtil = new vmTestUtil();

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmPrefix = suite.generateId(vmPrefix, null);
        vnetPrefix = suite.generateId(vnetPrefix, null);
        subnetPrefix = suite.generateId(subnetPrefix, null);
        timeout = suite.isMocked ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    after(function(done) {
      setTimeout(vmUtil.deleteVnet(vnetPrefix, suite, function() {
        suite.teardownSuite(done);
      }), timeout);
    });
    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        done();
      });
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('Vm Create:', function() {
      it('create with multi nic should pass', function(done) {
        vmUtil.createSubnetVnet(vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr, location, suite, function() {
          vmUtil.getImageName('Linux', suite, function(imagename) {
            var cmd = util.format('vm create %s %s %s %s -z %s --virtual-network-name %s --subnet-names %s --nic-config %s:%s:::%s,%s:%s:::%s --json', vmPrefix, imagename, username, password, vmSize, vnetPrefix, subnetPrefix, nicPrefix1, subnetPrefix, ipForwardingVal, nicPrefix2, subnetPrefix, ipForwardingVal).split(' ');
            cmd.push('-l');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('delete with multi nic should pass', function(done) {
        var cmd = util.format('vm delete %s --quiet --json', vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });

    });
  });
});
