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
var getVnet = new Object();
var getAffinityGroup = new Object();

var suite;
var vmPrefix = 'clitestvm';
var createdVms = [];
var createdVnets = [];
var testPrefix = 'cli.vm.staticvm_create-from-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
	var vmUtil = new vmTestUtil();
    var vmName,
      location,
      file = 'vminfo.json',
      username = 'azureuser',
      password = 'Collabera@01',
      retry = 5,
      timeout;
      testUtils.TIMEOUT_INTERVAL = 12000;
	  
	
    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
		timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

	after(function(done) {
		if (suite.isMocked)
			suite.teardownSuite(done);
		else {
			suite.teardownSuite(function() {
				createdVnets.forEach(function(item) {
					suite.execute('network vnet delete %s -q --json', item, function(result) {
						result.exitStatus.should.equal(0);
					});
				});
				done();
			});
		}
	});

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        done();
      });
    });

    afterEach(function(done) {
		vmUtil.deleteVMCreatedByStatisIp(vmName, timeout, suite, function() {
			suite.teardownTest(done);
		});
		
    });

    describe('Create a VM with static ip address:', function() {
      it('Create a VM with static ip address', function(done) {
		vmUtil.getImageName('Windows', suite, function(imagename) {
        vmUtil.getVnetStaticIP('Created',getVnet, getAffinityGroup, createdVnets, suite, function(virtualnetName, affinityName, staticIpToCreate, staticIpToSet) {
            var cmd = util.format('vm create --virtual-network-name %s -n %s --affinity-group %s %s %s %s %s --static-ip %s --json',
              virtualnetName, vmName, affinityName, vmName, imagename, username, password, staticIpToSet).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm export %s %s --json', vmName, file).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                 done();
              });
            });
          });
        });
      });

      it('VM Create-from a file and assert the static ip', function(done) {
        var Fileresult = fs.readFileSync(file, 'utf8');
        var obj = JSON.parse(Fileresult);
        obj['RoleName'] = vmName;
        var diskName = obj.oSVirtualHardDisk.name;
		//diskname = obj.dataVirtualHardDisks[0].name;
      vmUtil.waitForDiskRelease(diskName, timeout, timeout, suite, function() {
          var jsonstr = JSON.stringify(obj);
          fs.writeFileSync(file, jsonstr);
          vmUtil.getVnetStaticIP('Created',getVnet, getAffinityGroup, createdVnets, suite, function(virtualnetName, affinityName, staticIpToCreate, staticIpToSet) {
            var cmd = util.format('vm create-from %s %s --virtual-network-name %s --affinity-group %s --json', vmName, file, virtualnetName, affinityName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm static-ip show %s --json', vmName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var vnets = JSON.parse(result.text);
                vnets.Network.StaticIP.should.equal(staticIpToSet);
                fs.unlinkSync('vminfo.json');
                done();
              });
            });
          });
        });
      });
    });
  });
});