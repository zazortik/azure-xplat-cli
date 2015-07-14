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
var should = require('should');
var util = require('util');
var path = require('path');
var fs = require('fs');

var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');
var getVnet = new Object();
var getAffinityGroup = new Object();

var suite, vmPrefix;
var vmPrefix = 'clitestvm';
var createdVnets = [];
var testPrefix = 'cli.vm.staticvm_docker-tests';
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];

describe('cli', function() {
    describe('vm', function() {
        var vmName,
            dockerCertDir,
            timeout,
            location, retry = 5,
            username = 'azureuser',
            password = 'Pa$$word@123',
            homePath, dockerPort = 2376;
        testUtils.TIMEOUT_INTERVAL = 12000;
        var vmUtil = new vmTestUtil();

        var vmToUse = {
            Name: null,
            Created: false,
            Delete: false
        };

        before(function(done) {
            suite = new CLITest(this, testPrefix, requiredEnvironment);
            suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
				done();
			});
            homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        });

		after(function(done) {
			if (suite.isMocked)
				suite.teardownSuite(done);
			else {
				suite.teardownSuite(function() {
					createdVnets.forEach(function(item) {
						suite.execute('network vnet delete %s -q --json', item, function(result) {
							result.exitStatus.should.equal(0);
						});
					});
					done();
				});
			}
		});

        beforeEach(function(done) {
            suite.setupTest(function() {
                vmName = suite.generateId(vmPrefix, null);
                done();
            });
        });

        afterEach(function(done) {
            vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
                suite.teardownTest(done);
                vmUtil.deleteDockerCertificates(dockerCertDir);
            });
        });

        describe('Vm Create: ', function() {
            it('Create Docker VM with staticip should pass', function(done) {
                dockerCertDir = path.join(homePath, '.docker');
                vmUtil.getImageName('Linux', suite, function(ImageName) {
                    vmUtil.getVnetStaticIP('Created', getVnet, getAffinityGroup, createdVnets, suite, function(virtualnetName, affinityName, staticIpToCreate, staticIpToSet) {
                        var cmd = util.format('vm docker create %s %s %s %s -a %s --static-ip %s --virtual-network-name %s --json',
                            vmName, ImageName, username, password, affinityName, staticIpToSet, virtualnetName).split(' ');
                        testUtils.executeCommand(suite, retry, cmd, function(result) {
                            result.exitStatus.should.equal(0);
                            cmd = util.format('vm show %s --json', vmName).split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                                result.exitStatus.should.equal(0);
                                var certifiatesExist = vmUtil.checkForDockerCertificates(vmName, dockerCertDir);
                                certifiatesExist.should.be.true;
                                var cratedVM = JSON.parse(result.text);
                                var dockerPortExists = vmUtil.checkForDockerPort(cratedVM, dockerPort);
                                dockerPortExists.should.be.true;

                                cratedVM.VMName.should.equal(vmName);
                                vmToUse.Name = vmName;
                                vmToUse.Created = true;
                                vmToUse.Delete = true;
                                setTimeout(done, timeout);
                            });
                        });
                    });
                });
            });
        });
    });
});