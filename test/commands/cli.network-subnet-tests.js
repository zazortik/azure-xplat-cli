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
var testprefix = 'cli.network.subnet-tests';
var networkTestUtil = require('../util/asmNetworkTestUtil');

var vnetPrefix = 'CliTestVnett',
    vnetAddressSpace = '10.0.0.0',
    vnetCidr = '20',
    subnetStartIp = '10.0.0.0',
    subnetCidr = '23';
var subnetPrefix = 'CliTestSubnett',
    subnetAddressPrefix = '10.0.2.0/23',
    subnetNewAddressPrefix = '10.0.4.0/23';
var nsgPrefix = 'CliTestNsg', location;

var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];

describe('cli', function() {
    describe('network', function() {
        var suite, timeout, retry = 5;
		testUtils.TIMEOUT_INTERVAL = 10000;
		var networkUtil = new networkTestUtil();

        before(function(done) {
            suite = new CLITest(this, testprefix, requiredEnvironment);
            suite.setupSuite(function() {
                vnetPrefix = suite.generateId(vnetPrefix, null);
                subnetPrefix = suite.generateId(subnetPrefix, null);
                nsgPrefix = suite.generateId(nsgPrefix, null);
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
                done();
            });
        });
        after(function(done) {
            networkUtil.deleteNSG(nsgPrefix, suite, function() {
                networkUtil.deleteVnet(vnetPrefix, suite, function() {
                    suite.teardownSuite(done);
                });
            });
        });
        beforeEach(function(done) {
            suite.setupTest(function() {
                location = process.env.AZURE_VM_TEST_LOCATION;
                done();
            });
        });
        afterEach(function(done) {
            suite.teardownTest(done);
        });

        describe('vnet subnet', function() {

            it('create should pass', function(done) {
                networkUtil.createVnet(vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr, location, timeout, suite, function() {
                    var cmd = util.format('network vnet subnet create %s %s -a %s --json', vnetPrefix, subnetPrefix, subnetAddressPrefix).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        done();
                    });
                });
            });
            it('set should modify subnet', function(done) {
                var cmd = util.format('network vnet subnet set %s %s -a %s --json', vnetPrefix, subnetPrefix, subnetNewAddressPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('show should display details about subnet ', function (done) {
				var cmd = util.format('network vnet subnet show %s %s --json', vnetPrefix, subnetPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.Name.should.equal(subnetPrefix);
					done();
				});
            });
            it('list should display all subnets in vnet', function(done) {
                var cmd = util.format('network vnet subnet list %s --json', vnetPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allResources = JSON.parse(result.text);
                    allResources.some(function(res) {
                        return res.Name === subnetPrefix;
                    }).should.be.true;
                    done();
                });
            });

            it('nsg add subnet should pass', function(done) {
                networkUtil.createNSG(nsgPrefix, location, suite, function() {
                    var cmd = util.format('network nsg subnet add %s %s %s --json', nsgPrefix, vnetPrefix, subnetPrefix).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        done();
                    });
                });
            });

            it('nsg remove subnet should pass', function(done) {
                var cmd = util.format('network nsg subnet remove %s %s %s --quiet --json', nsgPrefix, vnetPrefix, subnetPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });

            it('delete should delete subnet', function(done) {
                var cmd = util.format('network vnet subnet delete %s %s --quiet --json', vnetPrefix, subnetPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });

        });
    });
});