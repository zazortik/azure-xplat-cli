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
var vmPrefix = 'clitestvmVnet';
var createdVms = [];
var createdVnets = [];
var testPrefix = 'cli.vm.loadbalancer-tests';
var getVnetLB = new Object();
var getAffinityGroup = new Object();

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
	var vmUtil = new vmTestUtil();
    var vmName,
      location,
      vmVnetName,
      userName = 'azureuser',
      password = 'Collabera@01',
      retry = 5,
      subNet,
      Subnetip,
      internalLBName = 'duplicateloadname',
      loadname = 'testload',
      updateloadname = 'updateload',
      timeout;
    testUtils.TIMEOUT_INTERVAL = 12000;
	
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmVnetName = suite.generateId(vmPrefix, createdVms);
		location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

	after(function(done) {
		  if (suite.isMocked)
			suite.teardownSuite(done);
		  else {
			vmUtil.deleteVM(vmVnetName, timeout, suite, function() {
				suite.teardownSuite(function (){
					createdVnets.forEach(function (item) {
						suite.execute('network vnet delete %s -q --json', item, function (result) {
							result.exitStatus.should.equal(0);
						});
					});
					done();
				});
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

    describe('Load balancer :', function() {
      it('Vm should create with vnet', function(done) {
		vmUtil.getImageName('Linux', suite, function(imageName) {
          vmUtil.getVnetForLb('Created', getVnetLB, getAffinityGroup, createdVnets, suite, function(virtualnetName, location, subnetname, subnetip) {
            var cmd = util.format('vm create %s --virtual-network-name %s %s %s %s --json',
              vmVnetName, virtualnetName, imageName, userName, password).split(' ');
            cmd.push('-l');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              subNet = subnetname;
              Subnetip = subnetip;
              done();
            });
          });
        });
      });

      it('Load balance add on a created cloudservice', function(done) {
        var cmd = util.format('service internal-load-balancer add %s %s -t %s -a %s --json',
          vmVnetName, loadname, subNet, Subnetip).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Add loadbalancer to existing loadbalanced deployment', function(done) {
        var cmd = util.format('service internal-load-balancer add %s %s -t %s --json',
          vmVnetName, internalLBName, subNet).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.include('LoadBalancer already exists: testload. Only one internal load balancer allowed per deployment');
          done();
        });
      });

      it('Load balancer list', function(done) {
        var cmd = util.format('service internal-load-balancer list %s --json', vmVnetName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var loadlist = JSON.parse(result.text);
          loadlist[0].name.should.equal('testload');
          done();
        });
      });
	  
	  it('Load balancer update', function (done) {
        var cmd = util.format('service internal-load-balancer set %s %s -t %s -a %s --json', vmVnetName, updateloadname, subNet, Subnetip).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });	  

      it('Load balancer delete', function(done) {
        var cmd = util.format('service internal-load-balancer delete %s testload --quiet --json', vmVnetName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });


  });
});
