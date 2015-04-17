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
var testprefix = 'arm-network-lb-probe-tests';
var groupPrefix = 'xplatTestGCreate';
var groupName,
	location , 
	groupPrefix = 'xplatTestGCreateLbProbe',
	publicipPrefix = 'xplatTestIpLbProbe' , 
	LBName = 'xplattestlbLbProbe',
	VipName = 'xplattestVipName',
	lbprobePrefix = 'xplatTestLbProbe' ;
var publicIpId;
var  protocol= 'http', port ='80', path ='healthcheck.aspx', interval = '5', count = '2';
var  protocolNew ='tcp' , portNew='66',pathNew='newpage.aspx',intervalNew='10',countNew='3';
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'eastus'
    }];	


describe('arm', function () {
	describe('network', function () {
	var suite, timeout,
		retry = 5;
		testUtils.TIMEOUT_INTERVAL = 5000;
			
		before(function (done) {
			suite = new CLITest(testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);	
				publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
				LBName = suite.isMocked ? LBName : suite.generateId(LBName, null);
				lbprobePrefix = suite.isMocked ? lbprobePrefix : suite.generateId(lbprobePrefix, null);
				VipName = suite.isMocked ? VipName : suite.generateId(VipName, null);
				done();
			});
		});
		after(function (done) {
			deleteUsedLB(function() {
				deleteUsedPublicIp(function() {
					deleteUsedGroup(function() {	
						suite.teardownSuite(done);
					});
				});
			});
		});
		beforeEach(function (done) {
			suite.setupTest(function() {
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
				done();
			});
		});
		afterEach(function (done) {
		  suite.teardownTest(done);
		});

		describe('lb probe', function () {
		
			it('create', function (done) {
				createGroup(function(){
					createLB (function(){
						createPublicIp(function(){
							showPublicIp(function(){
								createFrontendIp(function(){
									var cmd = util.format('network lb probe create %s %s %s -p %s -o %s -t %s -i %s -c %s  --json',
											  groupName, LBName, lbprobePrefix, protocol, port, path, interval, count).split(' ');	
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
			it('list', function (done) {
				var cmd = util.format('network lb probe list %s %s --json', groupName, LBName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
				    result.exitStatus.should.equal(0);
						var allResources = JSON.parse(result.text);
						allResources.some(function (res) {
						return res.name === lbprobePrefix;
						}).should.be.true;
				    done();
				});
			});
			it('set', function (done) {
				var cmd = util.format('network lb probe set %s %s %s  -p %s -o %s -t %s -i %s -c %s --json', groupName, LBName, lbprobePrefix,protocolNew,portNew,pathNew,intervalNew,countNew).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
				    result.exitStatus.should.equal(0);
				    done();
				});
			});
			it('delete', function (done) {
				var cmd = util.format('network lb probe delete %s %s %s --quiet --json', groupName, LBName, lbprobePrefix).split(' ');
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
				setTimeout(function(){
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						callback();
					});
				}, timeout);
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
		
	});
});