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
var vmPrefix = 'clitestVm';
var testPrefix = 'cli.vm.create_loc_vnet_vm-tests';
var createdVms = [];
var createdVnets = [];
var getVnet = new Object();
var getAffinityGroup = new Object();
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmVnetName,
      timeout,
      location,
      userName = 'azureuser',
      password = 'Pa$$word@123',
      vmSize = 'ExtraSmall',
      retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;
    var vmUtil = new vmTestUtil();
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    after(function(done) {
      suite.teardownSuite(function() {
        if (!suite.isPlayback()) {
          createdVnets.forEach(function(item) {
            suite.execute('network vnet delete %s -q --json', item, function(result) {
              result.exitStatus.should.equal(0);
            });
          });
        }
        done();
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmVnetName = suite.generateId(vmPrefix, createdVms);
        done();
      });
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
      });
    });

    //create a vm with affinity group, vnet and availibilty set
    describe('Create:', function() {
      it('Vm should create with vnet and location', function(done) {
        vmUtil.getImageName('Linux', suite, function(imageName) {
          vmUtil.getVnet('Created', getVnet, getAffinityGroup, createdVnets, suite, vmUtil, function(virtualnetName, affinityName) {
            var cmd = util.format('account affinity-group show %s --json', affinityName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var vnetObj = JSON.parse(result.text);
              cmd = util.format('vm create -w %s %s %s %s %s --json', virtualnetName, vmVnetName, imageName, userName, password).split(' ');
              cmd.push('-l');
              cmd.push(vnetObj.location);
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                vmToUse.Created = true;
                vmToUse.Name = vmVnetName;
                vmToUse.Delete = true;
                done();
              });
            });
          });
        });
      });

      it('Vm should create with vnet', function(done) {
        vmUtil.getImageName('Linux', suite, function(imageName) {
          vmUtil.getVnet('Created', getVnet, getAffinityGroup, createdVnets, suite, vmUtil, function(virtualnetName, affinityName) {
            var cmd = util.format('vm create --ssh -w %s %s %s %s %s --json',
              virtualnetName, vmVnetName, imageName, userName, password).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              vmToUse.Created = true;
              vmToUse.Name = vmVnetName;
              vmToUse.Delete = true;
              done();
            });
          });
        });
      });

      it('Windows Vm with Vm size', function(done) {
        vmUtil.getImageName('Windows', suite, function(ImageName) {
          var cmd = util.format('vm create -z %s %s %s %s %s --json',
            vmSize, vmVnetName, ImageName, userName, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            vmToUse.Created = true;
            vmToUse.Name = vmVnetName;
            vmToUse.Delete = true;
            setTimeout(done, timeout);
          });
        });
      });
    });

  });
});
