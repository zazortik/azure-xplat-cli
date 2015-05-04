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
var testprefix = 'arm-network-subnet-tests';
var vnetPrefix = 'xplatTestVnet';     
var subnetprefix ='xplatTestSubnet'; 
var AddPrefix ='10.0.0.0/24';  
var createdVnets=[],createdGroups=[],createdSubnets = [];
var groupName,location,
	groupPrefix = 'xplatTestGCreateSubnet';
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'eastus'
}];
var nsgID,nsgName;	

describe('arm', function () {
	describe('network vnet', function () {
	var suite,
		retry = 5;

		before(function (done) {
			suite = new CLITest(this, testprefix, requiredEnvironment);
			suite.setupSuite(function() {	
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);	 
				vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
				subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix,null);
				done();
			});
		});
		after(function (done) {
			deleteVnet(function(){
				deleteUsedGroup(function(){
					suite.teardownSuite(done);
				});
			});  
		}); 
		beforeEach(function (done) {
		  suite.setupTest(done);
		});
		afterEach(function (done) {
		  suite.teardownTest(done);
		});

		describe('subnet', function () {
		
			it('create should pass', function (done) {
				createGroup(function(){
					createVnet(function(){
						createNSG(function(){
							showNSG(function(){
								var cmd = util.format('network vnet subnet create %s %s %s -a %s -w %s -o %s --json',groupName, vnetPrefix, subnetprefix,AddPrefix,nsgID,nsgName).split(' ');
								testUtils.executeCommand(suite, retry, cmd, function (result) {
								result.exitStatus.should.equal(0);
								done();
								});
							});
						});
					});
				});
			}); 
			it('list should display all subnets from vnet', function (done) {
				var cmd = util.format('network vnet subnet list %s %s --json',groupName, vnetPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.some(function (res) {
					return res.name === subnetprefix;
					}).should.be.true;
					done();
				});					
			});
			it('set should modify subnet', function (done) {
				var cmd = util.format('network vnet subnet set -a 10.0.1.0/24 %s %s %s -w %s -o %s --json', groupName, vnetPrefix, subnetprefix,nsgID,'NoSuchNSGExist').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('show should display deatails about subnet', function (done) {
				var cmd = util.format('network vnet subnet show %s %s %s --json ',groupName, vnetPrefix, subnetprefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.name.should.equal(subnetprefix) ;
					done();
				});
			});
			it('delete should delete subnet', function (done) {
				var cmd = util.format('network vnet subnet delete %s %s %s --quiet --json', groupName, vnetPrefix, subnetprefix).split(' ');
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
				var cmd = util.format('group delete %s --quiet --json', groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();
		} 
		function createNSG(callback) {
			var cmd = util.format('network nsg create %s %s %s --json', groupName, nsgName, location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
			    result.exitStatus.should.equal(0);
			    callback();
			});
		}
		function showNSG(callback) {
			var cmd = util.format('network nsg show %s %s --json', groupName, nsgName).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0); 
				var allResources = JSON.parse(result.text);
				nsgID = allResources.id;
				callback();
			});	
		}	
		function deleteNSG(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network nsg delete %s %s %s --quiet --json', groupName, nsgName).split(' ');
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
		function deleteVnet(callback) {
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