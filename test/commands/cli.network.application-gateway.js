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
var testprefix = 'cli.network.application.gateway-tests.js';

var location, appGatePrefix = 'CliTestAppGate',
    vnetPrefix = 'CliTestVnett',
    subnetPrefix = 'CliTestSubnett';
var instanceCount = '3',
    instanceCountNew = '4',
    gatewaySize = 'Medium',
    gatewaySizeNew = 'Small',
    description = 'Testing App Gateway';

var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];


describe('cli', function() {
    describe('network', function() {
        var suite, retry = 5, timeout;
        var networkUtil = new networkTestUtil();
		testUtils.TIMEOUT_INTERVAL = 5000;

        before(function(done) {
            suite = new CLITest(this, testprefix, requiredEnvironment);
            suite.setupSuite(function() {
                vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
                subnetPrefix = suite.isMocked ? subnetPrefix : suite.generateId(subnetPrefix, null);
                appGatePrefix = suite.isMocked ? appGatePrefix : suite.generateId(appGatePrefix, null);
                location = process.env.AZURE_VM_TEST_LOCATION;
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
                done();
            });
        });
        after(function(done) {
			setTimeout(function() {
				networkUtil.deleteVnet(vnetPrefix, suite, function() {
					suite.teardownSuite(done);
				});
			}, timeout);
        });
        beforeEach(function(done) {
            suite.setupTest(done);
        });
        afterEach(function(done) {
            suite.teardownTest(done);
        });

        describe('application-gateway', function() {

            it('create should pass', function(done) {
                networkUtil.createEmptySubVnet(vnetPrefix, subnetPrefix, location, suite, function() {
                    var cmd = util.format('network application-gateway create -n %s -e %s -t %s -c %s -z %s --json',
                        appGatePrefix, vnetPrefix, subnetPrefix, instanceCount, gatewaySize).split(' ');
                    cmd.push('-d');
                    cmd.push(description);
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        done();
                    });
                });
            });
            it('set should update an application gateway', function(done) {
                var cmd = util.format('network application-gateway set -n %s -e %s -t %s -c %s -z %s --json',
                    appGatePrefix, vnetPrefix, subnetPrefix, instanceCountNew, gatewaySizeNew).split(' ');
                cmd.push('-d');
                cmd.push(description);
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('show should display details about an application gateway', function(done) {
                var cmd = util.format('network application-gateway show -n %s --json', appGatePrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allresources = JSON.parse(result.text);
                    allresources.name.should.equal(appGatePrefix);
                    done();
                });
            });
            it('list should display all apllication-gateway in network', function(done) {
                var cmd = util.format('network application-gateway list --json').split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allResources = JSON.parse(result.text);
                    allResources.some(function(res) {
                        return res.name === appGatePrefix;
                    }).should.be.true;
                    done();
                });
            });
            it('delete should delete an application-gateway', function(done) {
                var cmd = util.format('network application-gateway delete %s --quiet --json', appGatePrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
        });

    });
});