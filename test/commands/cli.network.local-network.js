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
var testprefix = 'asm-network-local-network-tests';
var location ;

var vnetPrefix = 'CliTestLocVnet', vnetAddrSpace = '10.2.0.0', vnetCidr = '16', subnetStartIp = '10.2.0.0', subnetCidr = '19';       
var subnetPrefix = 'GatewaySubnet', subnetAddPrefix = '10.2.32.0/29';
var locNetPrefix = 'CliTestlocNet', vpnGatewayAddress = '100.100.100.100', AddressPrefix = '10.1.0.0/16', vpnGatewayAddressNew = '20.20.20.20', AddressPrefixNew = '10.0.0.0/19';


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
			    locNetPrefix = suite.generateId(locNetPrefix, null);
				vnetPrefix = suite.generateId(vnetPrefix, null);
				location = process.env.AZURE_VM_TEST_LOCATION;
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
			    done();
		    });
		});
		after(function (done) { 
			networkUtil.deleteVnet(vnetPrefix, suite, function() {
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

		describe('local-network', function () {
		
			it('create should pass', function (done) {
				var cmd = util.format('network local-network create -n %s -a %s -w %s --json', locNetPrefix, AddressPrefix, vpnGatewayAddress).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('add should add local-network to a vnet', function (done) {
				networkUtil.createVnet(vnetPrefix, vnetAddrSpace, vnetCidr, subnetStartIp, subnetCidr, location, timeout, suite, function() {
					networkUtil.createGatewaySubnet(vnetPrefix, subnetPrefix, subnetAddPrefix, timeout, suite, function() {
						var cmd = util.format('network vnet local-network add -n %s -l %s --json', vnetPrefix, locNetPrefix).split(' ');
						testUtils.executeCommand(suite, retry, cmd, function (result) {
							result.exitStatus.should.equal(0);
							done();
						});
					});
				});
			});
			it('list should display all local-network in network', function (done) {
				var cmd = util.format('network local-network list --json').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('show should display details about local-network', function (done) {
				var cmd = util.format('network local-network show -n %s --json', locNetPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('remove should remove a local-network from a vnet', function (done) {
				var cmd = util.format('network vnet local-network remove -n %s -l %s --json', vnetPrefix, locNetPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('set should modify local-network', function (done) {
				var cmd = util.format('network local-network set -n %s -a %s -w %s --json', locNetPrefix, AddressPrefixNew, vpnGatewayAddressNew).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('delete should delete local-network', function (done) {
				var cmd = util.format('network local-network delete -n %s -q --json', locNetPrefix).split(' ');
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