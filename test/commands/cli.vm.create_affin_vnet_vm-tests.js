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
var vmPrefix = 'clitestVnet';
var testPrefix = 'cli.vm.create_affin_vnet_vm-tests';
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
      location,
      availSetName = 'Testset',
      userName = 'azureuser',
      password = 'Pa$$word@123',
      timeout,
      retry;
    testUtils.TIMEOUT_INTERVAL = 5000;
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
        retry = 5;
        done();
      });
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(function() {
          if (!suite.isPlayback()) {
            createdVnets.forEach(function(item) {
              suite.execute('network vnet list --json', item, function(result) {
                result.exitStatus.should.equal(0);
                var vnetList = JSON.parse(result.text);
                var found = affinList.some(function(vnetItem) {
                  if (vnetItem.name === item) {
                    return true;
                  }
                });
                
                if (found) {
                  suite.execute('network vnet delete %s -q --json', item, function(result) {
                    result.exitStatus.should.equal(0);
                  });
                }
                
              });
            });
          }
          done();
        });
      });
    });

    //create a vm with affinity group, vnet and availibilty set
    describe('Create:', function() {
      it('Vm with affinity, vnet and availibilty set', function(done) {
        vmVnetName = suite.generateId(vmPrefix, createdVms);
        vmUtil.getImageName('Linux', suite, function(imageName) {
          getAffinityGroup.location = location;
          vmUtil.getVnet('Created', getVnet, getAffinityGroup, createdVnets, suite, vmUtil, function(virtualnetName, affinityName) {
            var cmd = util.format('vm create -A %s -n %s -a %s -w %s %s %s %s %s --json',
              availSetName, vmVnetName, affinityName, virtualnetName, vmVnetName, imageName, userName, password).split(' ');
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

      //edge case for vm failure
      //https://github.com/MSOpenTech/azure-xplat-cli/issues/7#issuecomment-47410767
      it('should delete cloud service on vm create failure', function(done) {
        vmVnetName = suite.generateId(vmPrefix, createdVms);
        vmUtil.getImageName('Linux', suite, function(imageName) {
          var cmd = util.format('vm create -a %s -w %s %s %s %s %s --json',
            'some_name', 'some_name', vmVnetName, imageName, userName, password).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.not.equal(0);
            cmd = util.format('service show %s --json', vmVnetName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.not.equal(0);
              done();
            });
          });
        });
      });
    });
  });
});
