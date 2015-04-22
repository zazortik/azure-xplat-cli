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
var testprefix = 'arm-network-publicip-tests';
var groupPrefix = 'xplatTestGCreate';
var dnsPrefix = 'dnstestpubip';
var dnsPrefix1 = 'dnstestpubip1';
var groupName, dnsName, dnsName1, location, reversefqdn, reversefqdn1;
var allocationMethod = 'Static';
var idleTimeout = '4';
var tags = 'tag1=testValue1';
 var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}];

describe('arm', function () {
    describe('network', function () {
    var suite, 
		retry = 5;
	var publicipName = 'armpublicip';
	var publicipNameNew = 'armpublicipnew';
	
		before(function (done) {
			suite = new CLITest(this, testprefix, requiredEnvironment);
			suite.setupSuite(function() {
				dnsName = suite.generateId(dnsPrefix.toLowerCase(), null);
				dnsName1 = suite.generateId(dnsPrefix1.toLowerCase(), null);
				groupName = suite.isMocked ? 'armrestestingpubgrp' : suite.generateId(groupPrefix, null);
				publicipName = suite.generateId(publicipName, null);
				publicipNameNew = suite.generateId(publicipNameNew, null);
				location = process.env.AZURE_VM_TEST_LOCATION;
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

		describe('publicip', function () {
		
			it('create', function (done) {
				createGroup(function(){
					var cmd = util.format('network public-ip create -g %s -n %s -d %s -l %s -a %s -i %s -t %s --json', groupName, publicipName, dnsName, location, allocationMethod, idleTimeout, tags).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						result.text.should.not.be.null;
						var allResources = JSON.parse(result.text);
						reversefqdn = allResources.dnsSettings.fqdn;
						done();
					});
				});
			});
			it('should create', function (done) {
				var cmd = util.format('network public-ip create -g %s -n %s -l %s -d %s -f %s --json', groupName, publicipNameNew, location, dnsName1, reversefqdn).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
						reversefqdn1 = allResources.dnsSettings.fqdn;
					done();
				});
			});
			it('set', function (done) {
				var cmd = util.format('network public-ip set -g %s -n %s -d %s -a %s -i %s -f %s -t %s', groupName, publicipName, dnsPrefix, 'Dynamic', '5', reversefqdn1, 'tag1=testValue1;tag2=testValue2').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('should set', function (done) {
				var cmd = util.format('network public-ip set -g %s -n %s -d %s -a %s -i %s --no-tags', groupName, publicipName, dnsPrefix, 'Static', '6').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('show', function (done) {
				var cmd = util.format('network public-ip show %s %s --json', groupName, publicipName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.name.should.equal(publicipName);
					done();
				});
			});
			it('list', function (done) {
				var cmd = util.format('network public-ip list %s --json', groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allResources = JSON.parse(result.text);
					allResources.some(function (res) {
					return res.name === publicipName;
					}).should.be.true;
					done();
				});
			});
			it('delete', function (done) {
				var cmd = util.format('network public-ip delete %s %s --quiet', groupName, publicipName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('should delete', function (done) {
				var cmd = util.format('network public-ip delete %s %s --quiet', groupName, publicipNameNew).split(' ');
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
	
	});
});