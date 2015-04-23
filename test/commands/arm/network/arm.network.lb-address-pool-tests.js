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
var CLITest = require('../../../framework/arm-cli-test');
var testUtils = require('../../../util/util');
var testprefix = 'arm-network-lb-address-pool-tests';
var groupPrefix = 'xplatTestGCreate';
var groupName,
	publicipPrefix = 'xplatTestIpAP' , 
	LBName = 'armEmptyLB',
	LBAddPool = 'LB-AddPoll',
	VipName = 'xplattestVipName',
	NicName = 'xplatNicName',
	vnetPrefix = 'xplatTestVnetNIc' ,    
	subnetprefix ='xplatTestSubnetNIc' ,
	location;
	var publicIpId,subnetId;
	
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}];

describe('arm', function () {
	describe('network', function () {
    var suite,
	    retry = 5;
	
		before(function (done) {
			suite = new CLITest(this, testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? 'armrestestinggrp' : suite.generateId(groupPrefix, null)
				publicipPrefix = suite.isMocked ? 'xplatTestIpAP' : suite.generateId(publicipPrefix, null);
				LBName = suite.isMocked ? 'armEmptyLB' : suite.generateId(LBName, null);
				LBAddPool = suite.isMocked ? 'LB-AddPoll' : suite.generateId(LBAddPool, null);
				VipName = suite.isMocked ? VipName : suite.generateId(VipName, null);
				NicName = suite.isMocked ? NicName : suite.generateId(NicName, null);
				vnetPrefix = (suite.isMocked) ? vnetPrefix : suite.generateId(vnetPrefix, null);
				subnetprefix = (suite.isMocked) ? subnetprefix : suite.generateId(subnetprefix, null);
				done();
			});
		});
		after(function (done) {
			deleteUsedNic(function() {
				deleteUsedSubnet(function() {
					deleteUsedVnet(function() {
						deleteUsedLB ( function() {
							deleteUsedPublicIp ( function() {
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

		describe('lb address-pool', function () {
		
			it('create', function (done) {
				createGroup(function(){
					createLB (function(){
						createPublicIp(function(){
							showPublicIp(function(){
								createFrontendIp(function(){
									var cmd = util.format('network lb address-pool create -g %s -l %s %s --json', groupName, LBName, LBAddPool).split(' ');
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
			it('add', function (done) {
				createVnet(function(){
					createSubnet(function(){
						showSubnet(function(){
							createNic(function(){
								var cmd = util.format('network lb address-pool add -g %s -l %s %s -a %s --json', groupName, LBName, LBAddPool, NicName).split(' ');
								testUtils.executeCommand(suite, retry, cmd, function (result) {
									result.exitStatus.should.equal(0);
									done();
								});
							});
						});
					});	
				});
			});
			it('remove', function (done) {
				var cmd = util.format('network lb address-pool remove -g %s -l %s %s -a %s --json', groupName, LBName, LBAddPool, NicName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('list', function (done) {
				var cmd = util.format('network lb address-pool list -g %s -l %s --json', groupName, LBName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources[0].name.should.equal(LBAddPool);
					done();
				});
			});
			it('delete', function (done) {
				var cmd = util.format('network lb address-pool delete -g %s -l %s %s -q --json', groupName, LBName, LBAddPool).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
		  
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
				var cmd = util.format('group delete %s --quiet', groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();
		}
		function createNic(callback) {
			var cmd = util.format('network nic create %s %s --location %s -u %s --json', groupName, NicName, location, subnetId).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function deleteUsedNic(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network nic delete %s %s --quiet', groupName, NicName).split(' ');
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
				var cmd = util.format('network public-ip delete %s %s --quiet', groupName, publicipPrefix).split(' ');
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
		function createFrontendIp(callback){
			var cmd = util.format('network lb frontend-ip create %s %s %s -u %s',groupName, LBName, VipName, publicIpId).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function createVnet(callback) {
			var cmd = util.format('network vnet create %s %s %s ',groupName,vnetPrefix,location).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});      
		} 
		function createSubnet(callback) {
			var cmd = util.format('network vnet subnet create %s %s %s ',groupName,vnetPrefix,subnetprefix).split(' ');
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
				var cmd = util.format('network vnet subnet delete %s %s %s --quiet', groupName, vnetPrefix, subnetprefix).split(' ');
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
				var cmd = util.format('network vnet delete %s %s --quiet', groupName, vnetPrefix).split(' ');
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