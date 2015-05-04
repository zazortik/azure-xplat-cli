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
var testprefix = 'arm-network-dns-zone-tests';
var groupName,
	location , 
	groupPrefix = 'xplatTestGCreateDns',
	dnszonePrefix = 'xplatTestdns' ;
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'southeastasia'
    }];


describe('arm', function () {
	describe('network dns-zone', function () {
		var suite,
			retry = 5;

		before(function (done) {
		  suite = new CLITest(this, testprefix, requiredEnvironment);
		  suite.setupSuite(function() {
			  location = process.env.AZURE_VM_TEST_LOCATION;
			  groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);	
			  dnszonePrefix = suite.isMocked ? dnszonePrefix : suite.generateId(dnszonePrefix, null);
			 			  
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

		describe('lb', function () {
				
			it('create', function (done) {
				createGroup(function(){
					var cmd = util.format('network dns-zone create %s %s --json', groupName, dnszonePrefix).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
						
				});
			});  
			
			it('set', function (done) {
			  var cmd = util.format('network dns-zone set %s %s --quiet --json', groupName, dnszonePrefix).split(' ');
			  testUtils.executeCommand(suite, retry, cmd, function (result) {
				    result.exitStatus.should.equal(0);
				    done();
				});
			});
			
			it('show', function (done) {
				var cmd = util.format('network dns-zone show %s %s --json', groupName, dnszonePrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					    var allresources = JSON.parse(result.text);
						allresources.name.should.equal(dnszonePrefix);
					done();
				});
			});
			
			it('list', function (done) {
			  var cmd = util.format('network dns-zone list %s --json',groupName).split(' ');
			  testUtils.executeCommand(suite, retry, cmd, function (result) {
				    result.exitStatus.should.equal(0);
				    var allResources = JSON.parse(result.text);
				    allResources.some(function (res) {
					return res.name === dnszonePrefix;
				    }).should.be.true;
				    done();
				});
			});
			
			it('delete', function (done) {
			  var cmd = util.format('network dns-zone delete %s %s --quiet --json', groupName, dnszonePrefix).split(' ');
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
			
	});
});