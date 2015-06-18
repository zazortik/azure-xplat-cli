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

var testPrefix = 'arm-cli-webapp-tests';

var sitename;
var createdSites = [];
var resourcegroupName = 'Default-Web-WestUS';
var planName = 'Default1';
var location = "westus";
var createdGroups = [];
var createdResources = [];
var subscription = profile.current.getSubscription();
var resourceClient = utils.createResourceClient(subscription);

describe('arm', function () {
  var suite;

  before(function (done) {
    suite = new CLITest(this, testPrefix);
    suite.setupSuite(function () {
      sitename = suite.generateId('webapp-tst', createdSites);
      if (!suite.isPlayback()) {
        suite.execute('webapp create --resourcegroup %s --name %s --location %s --plan %s --json',
              resourcegroupName,
              sitename,
              location,
              planName,
              function (result) {
                result.exitStatus.should.equal(0);
                done();
              });
      } else {
        done();
      }
    });
  });

  after(function (done) {
    suite.teardownSuite(function () {
      if (!suite.isPlayback()) {
        suite.forEachName(createdGroups, function (groupName, next) {
          resourceClient.resourceGroups.deleteMethod(groupName, next);
        }, done);
        suite.forEachName(createdSites, function (item, next) {
          suite.execute('webapp delete --resourcegroup %s --name %s -q --json', resourcegroupName, item, function (result) {
            result.exitStatus.should.equal(0);
            next();
          });
        }, done);
      } else {
        done();
      };
    });

  });

  beforeEach(function (done) {
    suite.setupTest(done);
  });

  afterEach(function (done) {
    suite.teardownTest(done);
  });

  describe('create', function () {
    it('should create webapp', function (done) {
      createGroupAndPlan(function (err, az) {
        if (err) { return done(err); }
        var sitename2 = suite.generateId('webapp-tst', createdResources);
        var n = az.plan.lastIndexOf("resourceGroups");
        var cmd = 'webapp create --resourcegroup %s --name %s --location %s --plan %s --json';
        suite.execute(cmd, az.group, sitename2, location, createdResources[0], function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('webapp list --resourcegroup %s --json', az.group, function (result) {
            result.exitStatus.should.equal(0);
            var webapps = JSON.parse(result.text);
            // May be more than one if running live, but there has to be at least one.
            webapps.length.should.be.above(0);
            webapps.some(function (app) {
              return app.name === sitename2;
            }).should.be.true;
            done();
          });
        });
      });
    });
  });

  describe('webapp', function () {
    it('stop should work', function (done) {
      suite.execute('webapp stop --resourcegroup %s --name %s --json', resourcegroupName, sitename, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('start should work', function (done) {
      suite.execute('webapp start --resourcegroup %s --name %s --json', resourcegroupName, sitename, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('restart should work', function (done) {
      suite.execute('webapp restart --resourcegroup %s --name %s --json', resourcegroupName, sitename, function (result) {
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

  function createGroup(done) {
    var groupName = suite.generateId(testPrefix, createdGroups);
    resourceClient.resourceGroups.createOrUpdate(groupName, { location: location }, function (err) {
      return done(err, groupName);
    });
  }

  function createHostingPlan(groupName, done) {
    var hostingPlanName = suite.generateId(testPrefix, createdResources);
    var planToCreate = {
      resourceName: hostingPlanName,
      resourceProviderNamespace: 'Microsoft.Web',
      resourceType: 'serverFarms',
      resourceProviderApiVersion: '2014-06-01'
    };

    var planParameters = {
      properties: {
        sku: 'Free',
        numberOfWorkers: 1,
        workerSize: 'Small',
        hostingPlanName: hostingPlanName
      },
      location: location
    };

    resourceClient.resources.createOrUpdate(groupName, planToCreate, planParameters, function (err, planResource) {
      return done(err, planResource.resource.id);
    });
  }
});

function resourceGroupFromId(id) {
  var re = /^\/subscriptions\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\/resourcegroups\/([^/]+)\//;
  var match = id.match(re);
  if (match) {
    return match[1];
  }
  throw new Error('Resource id does not match:', id);
}

