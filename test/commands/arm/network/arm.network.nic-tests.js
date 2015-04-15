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
var testprefix = 'arm-network-nic-tests';
var groupName,
	groupPrefix = 'xplatTestGCreateNic' ,
	vnetPrefix = 'xplatTestVnetNIc' ,    
	subnetprefix ='xplatTestSubnetNIc' ,
	nicPrefix = 'xplatTestNic' ,
	location ;
	
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'eastus'
}];

var subnetId;
	
describe('arm', function () {
	describe('network', function () {
	var suite;
			
		before(function (done) {
		suite = new CLITest(testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);	
				vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
				subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix, null);
				nicPrefix = suite.isMocked ? nicPrefix : suite.generateId(nicPrefix, null);	
				done();
			});
		});
		after(function (done) {
			deleteUsedSubnet(function() {
				deleteUsedVnet(function() {
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

		describe('nic', function () {
		
			it('create', function (done) {
				createGroup(function(){
					createVnet(function(){
						createSubnet(function(){
							showSubnet(function(){
								suite.execute('network nic create %s %s %s -u %s ', groupName, nicPrefix, location, subnetId, function (result) {
									result.exitStatus.should.equal(0);
									done();
								});
							});	
						});	
					});
				});
			});
			it('set', function (done) {
				suite.execute('network nic set %s %s -t priority=high ', groupName, nicPrefix,function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('show', function (done) {
				suite.execute('network nic show %s %s --json', groupName, nicPrefix, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.name.should.equal(nicPrefix);
					done();
				});
			});
			it('list', function (done) {
				suite.execute('network nic list %s --json',groupName, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.some(function (res) {
					return res.name === nicPrefix;
					}).should.be.true;
					done();
				});
			});
			it('delete', function (done) {
				suite.execute('network nic delete %s %s --quiet', groupName, nicPrefix, function (result) {
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
		function createVnet(callback) {
			var cmd = util.format('network vnet create %s %s %s ',groupName,vnetPrefix,location).split(' ');
				suite.execute(cmd,  function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});      
		} 
		function createSubnet(callback) {
			var cmd = util.format('network vnet subnet create %s %s %s ',groupName,vnetPrefix,subnetprefix).split(' ');
				suite.execute(cmd,  function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});      
		} 
		function showSubnet(callback) {
			var cmd = util.format('network vnet subnet show %s %s %s --json ',groupName,vnetPrefix,subnetprefix).split(' ');
				suite.execute(cmd,  function (result) {
					result.exitStatus.should.equal(0); 
					var allResources = JSON.parse(result.text);
					subnetId = allResources.id;
					callback();
				});      
		}
		function deleteUsedSubnet(callback) {
			if (!suite.isPlayback()) {
				suite.execute('network vnet subnet delete %s %s %s --quiet', groupName, vnetPrefix, subnetprefix, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			}
			else
				callback();	
		}
		function deleteUsedVnet(callback) {
			if (!suite.isPlayback()) {
				suite.execute('network vnet delete %s %s --quiet', groupName, vnetPrefix, function (result) {
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