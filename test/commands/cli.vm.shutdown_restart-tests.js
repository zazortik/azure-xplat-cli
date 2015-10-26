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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');
// A common VM used by multiple tests
var suite;
var vmPrefix = 'CliTestVm';

var testPrefix = 'cli.vm.shutdown_restart-tests';
var createdVms = [];

var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];

describe('cli', function() {
    describe('vm', function() {
        var vmUtil = new vmTestUtil();
        var vmName,
            location,
            username = 'azureuser',
            password = 'Collabera@01',
            retry = 5;
        testUtils.TIMEOUT_INTERVAL = 5000;
        before(function(done) {
			suite = new CLITest(this, testPrefix, requiredEnvironment);
			suite.setupSuite(function(){
				vmName = suite.generateId(vmPrefix, createdVms);
				location = process.env.AZURE_VM_TEST_LOCATION;
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
				done();
			});
		});

        after(function(done) {
            if (suite.isMocked)
                suite.teardownSuite(done);
            else {
                vmUtil.deleteVM(vmName, timeout, suite, function() {
                    suite.teardownSuite(done);
                });
            }

        });

		beforeEach(function(done) {
		  suite.setupTest(done);
		});

        afterEach(function(done) {
            suite.teardownTest(done);
        });

        describe('Vm:', function() {
            it('Shutdown and start should work', function(done) {
                vmUtil.createVMShutdown(vmName, username, password, location, timeout, suite, function() {
                    var cmd = util.format('vm shutdown %s --json', vmName).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        setTimeout(function() {
                            cmd = util.format('vm start %s --json', vmName).split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                                result.exitStatus.should.equal(0);
                                done();
                            });
                        }, timeout);
                    });
                });
            });

            // VM Restart
            it('Restart should work', function(done) {
                cmd = util.format('vm restart  %s --json', vmName).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
        });

    });
});