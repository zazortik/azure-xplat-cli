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
var testprefix = 'cli.network.traffic-manager-profile-tests';
var networkTestUtil = require('../util/asmNetworkTestUtil');
var location;

var tmpPrefix = 'CliTesttmp',
    domainName = 'CliTestdom',
    lbMethod = 'Failover',
    monitorPort = '10',
    monitorProtocol = 'http',
    monitorPath = '/health.aspx',
    ttl = '200';
var lbMethodSet = 'RoundRobin',
    monitorPortSet = '15',
    monitorProtocolSet = 'https',
    monitorPathSet = '/healthy.aspx',
    ttlSet = '250';
var serviceEndPtPrefix = 'CliTestService' ,
	type = 'CloudService' , 
	endPointStatus = 'Enabled' ,
	endPointStatusN = 'Disabled' ;

var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];


describe('cli', function() {
    describe('network', function() {
        var suite, retry = 5;
		var networkUtil = new networkTestUtil();

        before(function(done) {
            suite = new CLITest(this, testprefix, requiredEnvironment);
            suite.setupSuite(function() {
                tmpPrefix = suite.isMocked ? tmpPrefix : suite.generateId(tmpPrefix, null);
				serviceEndPtPrefix = suite.isMocked ? serviceEndPtPrefix : suite.generateId(serviceEndPtPrefix, null);
                domainName = suite.isMocked ? domainName : suite.generateId(domainName, null);
                done();
            });
        });
        after(function(done) {
            networkUtil.deleteService(serviceEndPtPrefix, suite, function() {
                suite.teardownSuite(done);
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

        describe('traffic-manager profile', function() {
            it('create should pass', function(done) {
                var cmd = util.format('network traffic-manager profile create -n %s -d %s -m %s -o %s -p %s -r %s -t %s --json',tmpPrefix, domainName + '.trafficmanager.net', lbMethod, monitorPort, monitorProtocol, monitorPath, ttl).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
			it('endpoint create should Create an endpoint in a Traffic Manager profile', function(done) {
				networkUtil.createService(serviceEndPtPrefix, location, suite, function() {
					var cmd = util.format('network traffic-manager profile endpoint create -p %s -n %s -y %s -u %s --json',tmpPrefix, serviceEndPtPrefix + '.cloudapp.net', type, endPointStatus).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function(result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});	
            });
			it('endpoint set should Set an endpoint in a Traffic Manager profile', function(done) {
					var cmd = util.format('network traffic-manager profile endpoint set -p %s -n %s -y %s -u %s --json',tmpPrefix, serviceEndPtPrefix + '.cloudapp.net', type, endPointStatusN).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function(result) {
						result.exitStatus.should.equal(0);
						done();
					});
            });
			it('endpoint delete should Delete an endpoint from a Traffic Manager profile', function(done) {
                var cmd = util.format('network traffic-manager profile endpoint delete -p %s -n %s -q --json',tmpPrefix, serviceEndPtPrefix + '.cloudapp.net').split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('set should update traffic-manager profile', function(done) {
                var cmd = util.format('network traffic-manager profile set -n %s -m %s -o %s -p %s -r %s -t %s --json',tmpPrefix, lbMethodSet, monitorPortSet, monitorProtocolSet, monitorPathSet, ttlSet).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('show should display details about traffic-manager profile', function(done) {
                var cmd = util.format('network traffic-manager profile show -n %s --json', tmpPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allresources = JSON.parse(result.text);
                    allresources.profile.name.should.equal(tmpPrefix);
                    done();
                });
            });
            it('list should display all traffic-manager profile in network', function(done) {
                var cmd = util.format('network traffic-manager profile list --json').split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allResources = JSON.parse(result.text);
                    allResources.some(function(res) {
                        return res.name === tmpPrefix;
                    }).should.be.true;
                    done();
                });
            });
            it('enable traffic manager profile', function(done) {
                var cmd = util.format('network traffic-manager profile enable -n %s --json', tmpPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('disable traffic manager profile', function(done) {
                var cmd = util.format('network traffic-manager profile disable -n %s --json', tmpPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('delete should delete traffic-manager profile', function(done) {
                var cmd = util.format('network traffic-manager profile delete %s --quiet --json', tmpPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });

        });

    });
});