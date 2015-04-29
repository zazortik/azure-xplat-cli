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
var testprefix = 'arm-network-nic-tests';
var privateIP='10.31.255.250',privateIP2='10.31.254.254';
var groupName,nsgName,
	groupPrefix = 'xplatTestGrpCreateNic' ,
	vnetPrefix = 'xplatTestVnetNIc' ,    
	subnetprefix ='xplatTestSubnetNIc' ,
	nicPrefix = 'xplatTestNic' ,
	publicipPrefix = 'xplatTestIpNic' ,
	nsgPrefix='xplatTestNSGNic',
	location;
	
	
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'eastus'
}];

var subnetId,publicIpId,nsgId;
	
describe('arm', function () {
	describe('network', function () {
	var suite,
		retry = 5;
			
		before(function (done) {
		suite = new CLITest(this, testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);	
				vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
				subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix, null);
				nicPrefix = suite.isMocked ? nicPrefix : suite.generateId(nicPrefix, null);	
				publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
                nsgName	= suite.isMocked ? nsgPrefix : suite.generateId(nsgPrefix, null);			
				done();
			});
		});
		after(function (done) {
			deleteUsedSubnet(function() {
				deleteUsedVnet(function() {
					deleteUsedPublicIp(function(){
						deleteUsedNsg(function(){
							deleteUsedGroup(function() {	
						       suite.teardownSuite(done);
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

		describe('nic', function () {
		
			it('create should pass', function (done) {
				createGroup(function(){
					createVnet(function(){
						createSubnet(function(){
							showSubnet(function(){
								createPublicIp(function(){
									showPublicIp(function(){
										createNSG(function(){
											showNSG(function(){
												var cmd = util.format('network nic create %s %s %s -t priority=low -u %s -k %s -m %s -p %s -i %s -w %s -o %s -a %s --json', 
														  groupName,nicPrefix,location,subnetId,subnetprefix,vnetPrefix,publicipPrefix,publicIpId,nsgId,nsgName,privateIP).split(' ');
												testUtils.executeCommand(suite, retry, cmd, function (result) {
													result.exitStatus.should.equal(0);
													done();
												});
											});
										});
								    });
								});
							});	
						});	
					});
				});
			});
			it('set should modify nic', function (done) {
				var cmd = util.format('network nic set %s %s -t priority=high -w %s -o %s -i %s -p %s -a %s -u %s -k %s --no-tags --json' , groupName, nicPrefix,nsgId,'NoSuchNSGExists',publicIpId,'NoSuchPublicIpExist',privateIP2,subnetId , 'NoSuchSubnetExists').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('show should display details about nic', function (done) {
				var cmd = util.format('network nic show %s %s --json', groupName, nicPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.name.should.equal(nicPrefix);
					done();
				});
			});
			it('list should display all nic in group', function (done) {
				var cmd = util.format('network nic list %s --json',groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.some(function (res) {
					return res.name === nicPrefix;
					}).should.be.true;
					done();
				});
			});
			it('delete should delete nic', function (done) {
				var cmd = util.format('network nic delete %s %s --quiet --json', groupName, nicPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});

		});
	
		
		function createVnet(callback) {
			var cmd = util.format('network vnet create %s %s %s --json',groupName,vnetPrefix,location).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});      
		} 
		function createSubnet(callback) {
			var cmd = util.format('network vnet subnet create %s %s %s --json',groupName,vnetPrefix,subnetprefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});      
		} 
		function showSubnet(callback) {
			var cmd = util.format('network vnet subnet show %s %s %s --json ',groupName,vnetPrefix,subnetprefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0); 
					var allResources = JSON.parse(result.text);
					subnetId = allResources.id;
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
		function createNSG(callback) {
			var cmd = util.format('network nsg create %s %s %s --json',groupName,nsgName,location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);;
				callback();
			});	
		}
		function showNSG(callback) {
			var cmd = util.format('network nsg show %s %s --json', groupName, nsgName).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0); 
				var allResources = JSON.parse(result.text);
				nsgId = allResources.id;
				callback();
			});	
		}	
		function deleteUsedNsg(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network nsg delete %s %s --quiet --json', groupName, nsgName).split(' ');
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
	
	});
});