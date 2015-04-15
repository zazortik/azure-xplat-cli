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
var testprefix = 'arm-network-lb-tests';
var groupName,
	location , 
	groupPrefix = 'xplatTestGCreateLb',
	publicipPrefix = 'xplatTestIpLb' , 
	lbPrefix = 'xplattestlb' ; 
var publicIpId;
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
			  done();
		  });
		});
		after(function (done) {
			deleteUsedPublicIp(function() {
				deleteUsedGroup(function() {
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

		describe('lb', function () {
				
			it('create', function (done) {
				createGroup(function(){
					createPublicIp(function(){
						showPublicIp(function(){
							var cmd = util.format('network lb create %s %s eastus -p %s ', groupName , lbPrefix , publicIpId).split(' ');
							suite.execute(cmd,  function (result) {
							result.exitStatus.should.equal(0);
							done();
							});
						});
					});
				});
			});  
			it('show', function (done) {
				suite.execute('network lb show %s %s --json', groupName, lbPrefix, function (result) {
					result.exitStatus.should.equal(0);
					    var allresources = JSON.parse(result.text);
						allresources.name.should.equal(lbPrefix);
					done();
				});
			});
			it('list', function (done) {
			  suite.execute('network lb list %s --json',groupName, function (result) {
				    result.exitStatus.should.equal(0);
				    var allResources = JSON.parse(result.text);
				    allResources.some(function (res) {
					return res.name === lbPrefix;
				    }).should.be.true;
				    done();
				});
			});
			it('delete', function (done) {
			  suite.execute('network lb delete %s %s --quiet', groupName, lbPrefix, function (result) {
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