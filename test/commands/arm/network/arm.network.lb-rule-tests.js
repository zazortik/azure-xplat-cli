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
var testprefix = 'arm-network-lb-rule-tests';
var groupPrefix = 'xplatTestGCreate';
var groupName, protocol= 'tcp', fport ='80', bport ='80', enafip = 'true', idle = '4',
	publicipPrefix = 'xplatTestIpRule',
	LBName = 'armEmptyLB',
	LBAddPool = 'LB-AddPool',
	LBRuleName= 'LB-Rule',
	VipName = 'xplattestVipName',
	LBProbe='LB-Probe',
	location;
var publicIpId;
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
	defaultValue: 'southeastasia'
}];

describe('arm', function () {
    describe('network', function () {
    var suite,
		retry = 5;
	
		before(function (done) {
			suite = new CLITest(testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? 'armrestestingrulegrp' : suite.generateId(groupPrefix, null);
				publicipPrefix = suite.isMocked ? 'xplatTestIpRule' : suite.generateId(publicipPrefix, null);
				LBName = suite.generateId(LBName, null);
				LBAddPool = suite.generateId(LBAddPool, null);
				LBRuleName = suite.generateId(LBRuleName, null);
				LBProbe = suite.generateId(LBProbe,null);
				VipName = suite.isMocked ? VipName : suite.generateId(VipName, null);
				done();
			});
		});
		after(function (done) {
			deleteLBAddPool ( function() {
				deleteLBProbe(function(){
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
		beforeEach(function (done) {
			suite.setupTest(done);
		});
		afterEach(function (done) {
			suite.teardownTest(done);
		});

		  
		describe('lb rule', function () {
		
			it('create', function (done) {
				createGroup(function(){
					createLB (function(){
						createPublicIp(function(){
							showPublicIp(function(){
								createFrontendIp(function(){
									createLBAddPool (function(){
										createLBProbe(function(){
											var cmd = util.format('network lb rule create -g %s -l %s -n %s -p %s -f %s -b %s -e %s -i %s -o %s -a %s --json', 
													  groupName, LBName, LBRuleName, protocol, fport, bport, enafip, idle, LBAddPool, LBProbe).split(' ');
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
			it('set', function (done) {
				var cmd = util.format('network lb rule set -g %s -l %s -n %s -r %s -p %s -f %s -b %s -i %s -o %s -a %s --json', groupName, LBName, LBRuleName, "TestLBRuleName", protocol, '82', '82', '5', LBAddPool,LBProbe).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('list', function (done) {
				var cmd = util.format('network lb rule list -g %s -l %s --json', groupName, LBName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources[0].name.should.equal("TestLBRuleName");
					done();
				});
			});
			it('delete', function (done) {
				var cmd = util.format('network lb rule delete %s %s %s --quiet --json', groupName, LBName, "TestLBRuleName").split(' ');
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
		function createLBAddPool(callback){
			var cmd = util.format('network lb address-pool create %s %s %s --json', groupName, LBName, LBAddPool).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function createLBProbe(callback){
			var cmd = util.format('network lb probe create %s %s %s --json', groupName, LBName, LBProbe).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
		}
		function deleteLBProbe(callback){
			if (!suite.isPlayback()) {
			var cmd = util.format('network lb probe delete %s %s %s --quiet --json', groupName, LBName, LBProbe).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});
			}
			else
				callback();
		}
		function deleteLBAddPool(callback) {
			if (!suite.isPlayback()) {
				var cmd = util.format('network lb address-pool delete %s %s %s -q --json', groupName, LBName, LBAddPool).split(' ');
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
	
	});
});