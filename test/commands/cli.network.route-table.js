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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var networkTestUtil = require('../util/asmNetworkTestUtil');
var testprefix = 'asm-network-route-table-tests';
var location ;

var RouteTablePrefix = 'CliTestRouTab', RoutePrefix = 'CliTestRoute', VnetPrefix = 'CliTestVnet', SubnetPrefix = 'CliTestSubnet' ;
var Label = 'Route Table Creation', AddressPrefix = '0.0.0.0/0', NextHopType = 'VPNGateway' ;

   var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];


describe('asm', function () {
    describe('network', function () {
    var suite, timeout, retry = 5;
	var networkUtil = new networkTestUtil();
	testUtils.TIMEOUT_INTERVAL = 5000;

		before(function (done) {
		    suite = new CLITest(this, testprefix, requiredEnvironment);
		    suite.setupSuite(function() {
			    RouteTablePrefix = suite.isMocked ? RouteTablePrefix : suite.generateId(RouteTablePrefix, null);
				RoutePrefix = suite.isMocked ? RoutePrefix : suite.generateId(RoutePrefix, null);
				VnetPrefix = suite.isMocked ? VnetPrefix : suite.generateId(VnetPrefix, null);
				SubnetPrefix = suite.isMocked ? SubnetPrefix : suite.generateId(SubnetPrefix, null);
				location = process.env.AZURE_VM_TEST_LOCATION;
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
			    done();
		    });
		});
		after(function (done) { 
			networkUtil.deleteVnet(VnetPrefix, suite, function() {
				suite.teardownSuite(function() {
					done();
				});
			});
		});
		beforeEach(function(done) {
			suite.setupTest(done);
		});
		afterEach(function (done) {
		  suite.teardownTest(done);
		});

		describe('route-table', function () {
		
			it('create should pass', function (done) {
				var cmd = util.format('network route-table create -n %s -b %s --json', RouteTablePrefix, Label).split(' ');
				cmd.push('-l');
				cmd.push(location);
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('list should display all route-table in network', function (done) {
				var cmd = util.format('network route-table list --json').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('show should display details about route-table', function (done) {
				var cmd = util.format('network route-table show -n %s --json', RouteTablePrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('set should create a route in a route-table', function (done) {
				var cmd = util.format('network route-table route set -r %s -n %s -a %s -t %s --json', RouteTablePrefix, RoutePrefix, AddressPrefix, NextHopType).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('delete should delete route in a route-table', function (done) {
				var cmd = util.format('network route-table route delete -r %s -n %s -q --json', RouteTablePrefix, RoutePrefix).split(' ');
				setTimeout(function() {
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				}, timeout);
			});
			it('add should add a route-table to the subnet', function (done) {
				networkUtil.createVnetMin(VnetPrefix, SubnetPrefix, location, suite, function() {
					var cmd = util.format('network vnet subnet route-table add -t %s -n %s -r %s --json', VnetPrefix, SubnetPrefix, RouteTablePrefix).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
			it('show should display route-table in the subnet', function (done) {
				var cmd = util.format('network vnet subnet route-table show -t %s -n %s -d %s --json', VnetPrefix, SubnetPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('delete should delete a route-table to the subnet', function (done) {
				var cmd = util.format('network vnet subnet route-table delete -t %s -n %s -r %s -q --json', VnetPrefix, SubnetPrefix, RouteTablePrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('delete should delete route-table', function (done) {
				var cmd = util.format('network route-table delete -n %s -q --json', RouteTablePrefix).split(' ');
				setTimeout(function() {
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				}, timeout);
			});
		  
		});
		
	});
});