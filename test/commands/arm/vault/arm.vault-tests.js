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

var path = require('path');
var util = require('util');
var fs = require('fs')

var CLITest = require('../../../framework/arm-cli-test');
var log = require('../../../framework/test-logger');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testprefix = 'arm-cli-vault-tests';
var vaultPrefix = 'xplatTestVault';
var createdGroups = [];
var createdDeployments = [];

var requiredEnvironment = [{
    requiresToken: true
}, {
    name: 'AZURE_ARM_TEST_LOCATION',
    defaultValue: 'West US'
}, {
    name: 'AZURE_ARM_TEST_RESOURCE_GROUP',
    defaultValue: 'XplatTestVaultRG'
}];

var galleryTemplateName;
var galleryTemplateUrl;

describe('arm', function() {

    describe('vault', function() {
        var suite;
        var testLocation;
        var testResourceGroup;
        var normalizedTestLocation;

        before(function(done) {
            suite = new CLITest(testprefix, requiredEnvironment);
            suite.setupSuite(done);
        });

        after(function(done) {
            suite.teardownSuite(done);
        });

        beforeEach(function(done) {
            suite.setupTest(function() {
                testLocation = process.env.AZURE_ARM_TEST_LOCATION;
                testResourceGroup = process.env.AZURE_ARM_TEST_RESOURCE_GROUP;
                normalizedTestLocation = testLocation.toLowerCase().replace(/ /g, '');
                done();
            });
        });

        afterEach(function(done) {
            suite.teardownTest(done);
        });

        describe('basic', function() {
            it('management commands should work', function(done) {

                var vaultName = suite.generateId(vaultPrefix, createdGroups, suite.isMocked);
                createVaultMustSucceed();

                function createVaultMustSucceed() {
                    suite.execute('vault create %s --resource-group %s --location %s --json', vaultName, testResourceGroup, testLocation, function(result) {
                        result.exitStatus.should.be.equal(0);
                        showVaultMustSucceed();
                    });
                }

                function showVaultMustSucceed() {
                    suite.execute('vault show %s --resource-group %s --json', vaultName, testResourceGroup, function(result) {
                        result.exitStatus.should.be.equal(0);
                        var vault = JSON.parse(result.text);
                        vault.should.have.property('name');
                        vault.name.should.be.equal(vaultName);
                        deleteVaultMustSucceed();
                    });
                }

                function deleteVaultMustSucceed() {
                    suite.execute('vault delete %s --json --quiet', vaultName, function() {
                        showVaultMustFail();
                    });
                }

                function showVaultMustFail() {
                    suite.execute('vault show %s --resource-group %s', vaultName, testResourceGroup, function(result) {
                        result.exitStatus.should.equal(1);
                        result.errorText.should.include('Vault not found');
                        done();
                    });
                }

            });

        });

    });
});