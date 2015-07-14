//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
var should = require('should');
var util = require('util');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var suite;
var testPrefix = 'cli.network.nsg-tests';
var label = 'Nsg Create',
    nsgPrefix = 'xplatTestNSGNic',
    location;

var retry = 5;
var requiredEnvironment = [{
    name: 'AZURE_VM_TEST_LOCATION',
    defaultValue: 'West US'
}];

describe('cli', function() {
    describe('network', function() {

        before(function(done) {
            suite = new CLITest(this, testPrefix, requiredEnvironment);
            nsgPrefix = suite.isMocked ? nsgPrefix : suite.generateId(nsgPrefix, null);
            suite.setupSuite(done);
        });

        after(function(done) {
            suite.teardownSuite(done);
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

        describe('nsg', function() {

            it('create should pass', function(done) {
                var cmd = util.format('network nsg create %s --json', nsgPrefix).split(' ');
				cmd.push('-l');
                cmd.push(location);
                cmd.push('-l');
                cmd.push(location);
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
            it('show should display details about nsg', function(done) {
                var cmd = util.format('network nsg show %s %s --json', nsgPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allresources = JSON.parse(result.text);
                    allresources.name.should.equal(nsgPrefix);
                    done();
                });
            });
            it('list should display all nsgs', function(done) {
                var cmd = util.format('network nsg list --json').split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var allResources = JSON.parse(result.text);
                    allResources.some(function(res) {
                        return res.name === nsgPrefix;
                    }).should.be.true;
                    done();
                });
            });
            it('delete should delete the nsg', function(done) {
                var cmd = util.format('network nsg delete %s --quiet --json', nsgPrefix).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                });
            });
        });

    });
});