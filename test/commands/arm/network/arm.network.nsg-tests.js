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
var testprefix = 'arm-network-nsg-tests';
var createdGroups = [];
var createdNSGs = [];
var groupName, nsgName, location,
	groupPrefix = 'xplatTestGCreateNsg',
	nsgPrefix = 'xplatTestNsg';
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
				nsgName = suite.generateId(nsgPrefix, createdNSGs, suite.isMocked);
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

		describe('nsg', function () {
		
			it('create', function (done) {
				createGroup(function(){
					var cmd = util.format('network nsg create %s %s %s',groupName,nsgName,location).split(' ');
					suite.execute(cmd,  function (result) {
						 result.exitStatus.should.equal(0);
						 done();
					});
				});
			});
			it('set', function (done) {
				suite.execute('network nsg set -t age=old %s %s --json', groupName, nsgName, function (result) {
					 result.exitStatus.should.equal(0);
					 done();
				});
			});
			it('show', function (done) {
				suite.execute('network nsg show %s %s --json', groupName, nsgName, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.name.should.equal(nsgName);
					done();
				});
			});
			it('list', function (done) {
				suite.execute('network nsg list %s --json',groupName, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.some(function (res) {
					return res.name === nsgName;
					}).should.be.true;
					done();
				});
			});
			it('delete', function (done) {
				suite.execute('network nsg delete %s %s --quiet', groupName, nsgName, function (result) {
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