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
var testprefix = 'arm-network-lb-inboundrule-tests';
var groupName,
	location , 
	groupPrefix = 'xplatTestGCreateLbI',
	publicipPrefix = 'xplatTestIpLbI' , 
	lbPrefix = 'xplattestlbLbI' ,
	lbinboundprefix = 'xplattestInbound';
var publicIpId;
var protocol= 'tcp' , frontendport = '3380' , backendport = '3380' , enablefloatingip = 'true';
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'eastus'
    }];

describe('arm', function () {
	describe('network', function () {
		var suite;

		before(function (done) {
			suite = new CLITest(testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);	
				publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
				lbPrefix = suite.isMocked ? lbPrefix : suite.generateId(lbPrefix, null);		
				lbinboundprefix = suite.isMocked ? lbinboundprefix : suite.generateId(lbinboundprefix, null);	
				done();
			});
		});
		after(function (done) {
			deleteUsedLb(function() {
				deleteUsedPublicIp(function() {
					deleteUsedGroup(function() {	
						suite.teardownSuite(done);
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

		describe('lb-inboundrule', function () {
				
			it('create', function (done) {
				createGroup(function(){
					createPublicIp(function(){
						showPublicIp(function(){
							createLb(function(){
								suite.execute('network lb inboundrule create %s %s %s -p %s -f %s -b %s -e %s ',groupName,lbPrefix,lbinboundprefix,protocol,frontendport,backendport,enablefloatingip,function (result) {	
									result.exitStatus.should.equal(0);
									done();
								});
							});
						});
					});
				});
			});
			it('list', function (done) {
					suite.execute('network lb inboundrule list %s %s --json', groupName,lbPrefix, function (result) {
						result.exitStatus.should.equal(0);
						var allResources = JSON.parse(result.text);
						allResources[0].name.should.equal(lbinboundprefix);
						done();
					});
			});
			it('set', function (done) {
			    suite.execute('network lb inboundrule set %s %s %s -f 3381 -b 3381 -e false', groupName, lbPrefix, lbinboundprefix,function (result) {
				    result.exitStatus.should.equal(0);
				    done();
				});
			});
			it('delete', function (done) {
			    suite.execute('network lb inboundrule delete %s %s %s --quiet', groupName, lbPrefix, lbinboundprefix,function (result) {
				    result.exitStatus.should.equal(0);
				    done();
				});
			});
	  
		});
			
		function createGroup(callback) {
			suite.execute('group create %s --location %s --json', groupName, location, function (result) {
				result.exitStatus.should.equal(0);
				callback();
			});	
		}
		function createPublicIp(callback) {
			suite.execute('network public-ip create %s %s --location %s --json', groupName, publicipPrefix, location, function (result) {
				result.exitStatus.should.equal(0);;
				callback();
			});	
		}
		function showPublicIp(callback) {
			suite.execute('network public-ip show %s %s --json', groupName, publicipPrefix, function (result) {
				result.exitStatus.should.equal(0); 
				var allResources = JSON.parse(result.text);
				publicIpId = allResources.id;
				callback();
			});	
		}
		function createLb(callback) {
			var cmd = util.format('network lb create %s %s eastus -p %s ', groupName , lbPrefix , publicIpId).split(' ');
				suite.execute(cmd,  function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
		}
		function deleteUsedLb(callback) {
			if (!suite.isPlayback()) {
				suite.execute('network lb delete %s %s --quiet', groupName, lbPrefix, function (result) {
					result.exitStatus.should.equal(0);  
					callback();
				});
			}
			else
			callback();	
		}
		function deleteUsedPublicIp(callback) {
			if (!suite.isPlayback()) {
				suite.execute('network public-ip delete %s %s --quiet', groupName, publicipPrefix, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});	
			}
			else
			callback();	
		}
		function deleteUsedGroup(callback) {
			if (!suite.isPlayback()) {
				suite.execute('group delete %s --quiet', groupName, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
			callback();	
		}	
			
	});
});