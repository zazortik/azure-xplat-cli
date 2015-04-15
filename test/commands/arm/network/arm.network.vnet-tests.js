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
var testprefix = 'arm-network-vnet-tests';
var vnetPrefix = 'xplatTestVnet';
var createdGroups = [];
var groupName,location,
	groupPrefix = 'xplatTestGCreatevnet';
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
				groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);
				vnetPrefix = suite.generateId(vnetPrefix, createdGroups, suite.isMocked);
				done();
		   });
		});
		after(function (done) {
			deleteUsedGroup(function() {
				suite.teardownSuite(done);
			});
		});
		beforeEach(function (done) {
			suite.setupTest(done);
		});
		afterEach(function (done) {
			suite.teardownTest(done);
		});

		describe('vnet', function () {
		
			it('create', function (done) {
				createGroup(function(){
					var cmd = util.format('network vnet create %s %s %s -a 10.0.0.0/12 ', groupName, vnetPrefix, location).split(' ');
					suite.execute(cmd,  function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
			it('set', function (done) {
				 suite.execute('network vnet set %s %s -d 8.8.4.4 --json', groupName, vnetPrefix, function (result) {
					 result.exitStatus.should.equal(0);
					 done();
				 });
			});
			it('show', function (done) {
				suite.execute('network vnet show %s %s --json', groupName, vnetPrefix, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.name.should.equal(vnetPrefix);
					done();
				});
			});
			it('list', function (done) {
				suite.execute('network vnet list %s --json',groupName, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.some(function (res) {
					return res.name === vnetPrefix;
					}).should.be.true;
					done();
				});
			});
			it('delete', function (done) {
				suite.execute('network vnet delete %s %s --quiet', groupName, vnetPrefix, function (result) {
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