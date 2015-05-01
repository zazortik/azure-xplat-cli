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
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-network-lb-frontend-ip-tests';
var groupPrefix = 'xplatTestGCreateFronIp';
var createdGroups = [];
var groupName,
	publicipPrefix = 'xplatTestIp' , 
	LBName = 'armEmptyLB',
	FrontendIpName = 'xplattestFrontendIpName',
	LBNameSV = 'armEmptyLBSV',
	FrontendIpSV = 'xplatTestFrontendIpSV' ;	
var location;	
var publicIpId, publicIpName;

var vnetPrefix = 'xplatTestVnetFrontIp';     
var subnetprefix ='xplatTestSubnetFrontIp'; 
	
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
	describe('network', function () {
    var suite, retry = 5;
	
		before(function (done) {
			suite = new CLITest(this, testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? 'xplatTestGCreateFronIp' : suite.generateId(groupPrefix, null)
				publicipPrefix = suite.isMocked ? 'xplatTestIp' : suite.generateId(publicipPrefix, null);
				LBName = suite.isMocked ? 'armEmptyLB' : suite.generateId(LBName, null);
				FrontendIpName = suite.isMocked ? FrontendIpName : suite.generateId(FrontendIpName, null);
				LBNameSV = suite.isMocked ? 'armEmptyLBSV' : suite.generateId(LBNameSV, null);
				FrontendIpSV = suite.isMocked ? FrontendIpSV : suite.generateId(FrontendIpSV, null);
				vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
				subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix, null);
				done();
			});
		});
		
		
		after(function (done) {
			deleteUsedLB ( function() {
				deleteUsedPublicIp ( function() {
					deleteUsedLBSV ( function() {
						deleteUsedSubnet ( function() {
							deleteUsedVnet ( function() {
								deleteUsedGroup(function() {
									suite.teardownSuite(done);  
								});
							});	
						});
					});
				});
			});	
		});
		
		
		beforeEach(function (done) {
			suite.setupTest(done);
		});
		afterEach(function (done) {
			suite.teardownTest(done);
		});

		describe('lb frontend-ip', function () {
			
		// frontend-ip create using public-ip id
			it('create should pass', function (done) {
				createGroup(function(){
					createPublicIp(function(){
						showPublicIp(function(){
							createLB(function(){
								var cmd = util.format('network lb frontend-ip create %s %s %s -u %s  --json',groupName, LBName, FrontendIpName, publicIpId).split(' ');
								testUtils.executeCommand(suite, retry, cmd, function (result) {
									result.exitStatus.should.equal(0);
									done();
								});
							});
						});
					});
				});
			});
			
			
			//frontend-ip create using subnet & vnet
			it('create using subnet & vnet should pass', function (done) {
				
					createVnet(function(){
						createSubnet(function(){
							createLBSV(function(){
								var cmd = util.format('network lb frontend-ip create %s %s %s -e %s -m %s --json',groupName, LBNameSV, FrontendIpSV, subnetprefix,vnetPrefix).split(' ');	
								testUtils.executeCommand(suite, retry, cmd, function (result) {
									result.exitStatus.should.equal(0);
									done();
								});
							});
						});
					});
					
			});
			
			
		  it('set should modify frontend-ip', function (done) {
			  suite.execute('network lb frontend-ip set -g %s -l %s -n %s -u %s  --json', groupName, LBName, FrontendIpName,publicIpId,function (result) {
			  result.exitStatus.should.equal(0);
			  done();
			});
		  });
		  
			it('list should display all frontend-ips from load balancer ', function (done) {
				var cmd = util.format('network lb frontend-ip list -g %s -l %s --json', groupName, LBName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources[0].name.should.equal(FrontendIpName);
					done();
				});
			});
			
		  // it('delete should delete frontend-ip', function (done) {
			  // suite.execute('network lb frontend-ip delete -g %s -l %s %s -q --json', groupName, LBName, FrontendIpName, function (result) {
			  // result.exitStatus.should.equal(0);
			  // done();
			// });
		  // });
		  
		});
	
		function createGroup(callback) {
			var cmd = util.format('group create %s --location %s --json', groupName, location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function deleteUsedGroup(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('group delete %s --quiet --json', groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();
		}
		
		function createPublicIp(callback) {
			var cmd = util.format('network public-ip create %s %s --location %s --json', groupName, publicipPrefix, location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);;
				callback();
			});	
		}	
		function showPublicIp(callback) {
			var cmd = util.format('network public-ip show %s %s --json', groupName, publicipPrefix).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0); 
				var allResources = JSON.parse(result.text);
				publicIpId = allResources.id;
				publicIpName = allResources.name;
				callback();
			});	
		}
		function deleteUsedPublicIp(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network public-ip delete %s %s --quiet --json', groupName, publicipPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();
		}
		
		function createLB(callback){
			var cmd = util.format('network lb create %s %s %s --json', groupName, LBName, location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function deleteUsedLB(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network lb delete %s %s --quiet --json',groupName, LBName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();
		}	
		
		
		function createLBSV(callback){
			var cmd = util.format('network lb create %s %s %s --json', groupName, LBNameSV, location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function deleteUsedLBSV(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network lb delete %s %s --quiet --json',groupName, LBNameSV).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();
		}
		
		function createVnet(callback) {
			var cmd = util.format('network vnet create %s %s %s --json',groupName,vnetPrefix,location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
			    callback();
			});      
		} 
		
		function createSubnet(callback) {
			var cmd = util.format('network vnet subnet create %s %s %s --json',groupName, vnetPrefix, subnetprefix).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
			    callback();
			});      
		} 
		function deleteUsedSubnet(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network vnet subnet delete %s %s %s --quiet --json', groupName, vnetPrefix, subnetprefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
				    result.exitStatus.should.equal(0);
				    callback();
				});
			}
			else
				callback();
		}
		
		function deleteUsedVnet(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network vnet delete %s %s --quiet --json', groupName, vnetPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
				    result.exitStatus.should.equal(0);
				    callback();
				});
			}
			else
				callback();
		}
			
  });
});