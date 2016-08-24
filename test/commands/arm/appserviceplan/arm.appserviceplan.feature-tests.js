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
var CLITest = require('../../../framework/arm-cli-test');
var profile = require('../../../../lib/util/profile');
var utils = require('../../../../lib/util/utils');

var testPrefix = 'arm-cli-appserviceplan-tests';

var appservicename;
var createdSites = [];
var location1 = 'WestUS';
var location2 = 'Default-Web-WestUS';
var createdGroups = [];
var createdResources = [];
var hostingPlanName, groupName;
var resourceClient;
var updatedPHPValue = "7.0";
var servicePlanSku = "Standard";
var numberOfWorkers = 1;
var workerSize = 2;

describe('arm', function () {
    var suite;

    before(function (done) {
        suite = new CLITest(this, testPrefix);
        suite.setupSuite(function () {
            appservicename = suite.generateId('appservicepplanclitest', createdSites);
            groupName = suite.generateId('testrg1', createdGroups);
            var subscription = profile.current.getSubscription();
            resourceClient = utils.createResourceClient(subscription);
            if (!suite.isPlayback()) {
                suite.execute('group create %s --location %s --json', groupName, location1, function (result) {
                    result.exitStatus.should.equal(0);
                    createHostingPlan(groupName, function (err, planId) {
                        if (err) { return done(err); }
                        done();
                    });
                });
            } else {
                done();
            }

        });
    });

    after(function (done) {
        suite.teardownSuite(function () {
            if (!suite.isPlayback()) {
                createdGroups.forEach(function (item) {
                    suite.execute('group delete %s --quiet --json', item, function (result) {
                        result.exitStatus.should.equal(0);
                        done();
                    })
                });
            } else {
                done();
            }
        });
    });

    beforeEach(function (done) {
        suite.setupTest(done);
    });

    afterEach(function (done) {
        suite.teardownTest(done);
    });

    describe('appserviceplan', function () {
        

        it('create should work', function (done) {
            suite.execute('appserviceplan create %s %s %s %s %s %s --json', groupName, appservicename, location1, servicePlanSku, numberOfWorkers, workerSize, function (result) {
                result.exitStatus.should.equal(0);
                done();
            });
        });

        it('list should work', function (done) {
            suite.execute('appserviceplan list %s --json', groupName,  function (result) {
                result.exitStatus.should.equal(0);
                done();
            });
        });

        it('show should work', function (done) {
            suite.execute('appserviceplan show %s %s --json', groupName, appservicename,  function (result) {
                result.exitStatus.should.equal(0);
                done();
            });
        });

        it('delete should work', function (done) {
            suite.execute('appserviceplan delete %s %s --quiet --json', groupName, appservicename, function (result) {
                result.exitStatus.should.equal(0);
                done();
            });
        });

    });

    function createGroupAndPlan(done) {
        createGroup(function (err, groupName) {
            if (err) { return done(err); }
            createHostingPlan(groupName, function (err, planId) {
                if (err) { return done(err); }
                return done(null, { group: groupName, plan: planId });
            });
        });
    }

    function createHostingPlan(groupName, done) {
        hostingPlanName = suite.generateId(testPrefix, createdResources);
        var planToCreate = {
            resourceName: hostingPlanName,
            resourceProviderNamespace: 'Microsoft.Web',
            resourceType: 'serverFarms',
            resourceProviderApiVersion: '2014-06-01'
        };

        var planParameters = {
            properties: {
                sku: 'Standard',
                numberOfWorkers: 1,
                workerSize: 'Small',
                hostingPlanName: hostingPlanName
            },
            location: location1
        };

        resourceClient.resources.createOrUpdate(groupName, planToCreate.resourceProviderNamespace, '', planToCreate.resourceType,
            planToCreate.resourceName, planToCreate.resourceProviderApiVersion, planParameters, function (err, planResource) {
                return done(err, planResource.id);
            });


    }
});