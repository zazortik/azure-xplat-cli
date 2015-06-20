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

var _ = require('underscore');
var should = require('should');
var sinon = require('sinon');
var path = require('path');
var util = require('util');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');

var deployLib = require('../../../../lib/commands/arm/apiapp/lib/deployLib');
var profile = require('../../../../lib/util/profile');
var utils = require('../../../../lib/util/utils');

var testPrefix = 'arm-apiapp-tests';
var appNamePrefix = 'xplatApiApp';
var benchPackageId = 'Microsoft.Azure.AppService.ApiApps.TestBench';
var smtpPackageId = 'SmtpConnector';

var requiredEnvironment = [{
  name: 'AZURE_APIAPP_TEST_LOCATION',
  defaultValue: 'westus'
}];

describe('arm', function () {
  var suite;
  var location;
  var createdGroups = [];
  var createdResources = [];
  var subscription;
  var resourceClient;
  var deploymentNameStub;
  var originalSetTimeout = setTimeout;

  before(function (done) {
    // Stub deployLib's createDeploymentName function so that
    // we get predictable deployment names for mock recording
    deploymentNameStub = sinon.stub(deployLib, 'createDeploymentName');
    deploymentNameStub.returns('AppServiceDeployment_4cbe452f-2fba-4583-9177-0361dcd143e6');

    suite = new CLITest(this, testPrefix, requiredEnvironment);
    suite.setupSuite(function () {
      location = process.env.AZURE_APIAPP_TEST_LOCATION;
      subscription = profile.current.getSubscription();
      resourceClient = utils.createResourceClient(subscription);
      if (suite.isPlayback()) {
        setTimeout = function (action, timeout) {
          process.nextTick(action);
        };
      }
      done();
    });
  });

  after(function (done) {
    suite.teardownSuite(function () {
      deploymentNameStub.restore();
      // Clean up any created resource groups. No need to record cleanup
      // and no need to do this mocked, so cleanup happens here and
      // the cleanup is just skipped in playback.
      if (!suite.isPlayback()) {
        suite.forEachName(createdGroups, function (groupName, next) {
          resourceClient.resourceGroups.deleteMethod(groupName, next);
        }, done);
      } else {
        setTimeout = originalSetTimeout;
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

  describe('apiapp', function () {
    describe('list and show', function () {
      var group;
      var plan;
      var apiappName = 'listtest1';

      // Would normally do this in a before handler, but that
      // screws up the mock recording.
      // No need to explicitly delete anything, the outer suite's
      // after handler will delete the created resource group.
      function createAndDeploy(done) {
        if (!group) {
          createGroupAndPlan(function (err, az) {
            if (err) { return done(err); }
            group = az.group;
            plan = az.plan;

            var cmd = 'apiapp create -g %s -n %s -p %s -u %s --json';
            suite.execute(cmd, group, apiappName, plan, benchPackageId, function (result) {
              if (result.exitStatus !== 0) {
                return done(new Error('could not deploy apiapp for list test'));
              }
              done();
            });
          });
        } else {
          done();
        }
      }

      it('should list deployed apiapp when listing all in subscription', function (done) {
        createAndDeploy(function () {
          suite.execute('apiapp list --json', function (result) {
            result.exitStatus.should.equal(0);
            var output = JSON.parse(result.text);
            output.some(function (apiapp) { return apiapp.name === apiappName; }).should.be.true;
            done();
          });
        });
      });

      it('should not include package version or auth setting by default', function (done) {
        createAndDeploy(function () {
          suite.execute('apiapp list --json', function (result) {
            result.exitStatus.should.equal(0);
            var output = JSON.parse(result.text);
            output.every(function (apiapp) { return _.isUndefined(apiapp.package.version); }).should.be.true;
            output.every(function (apiapp) { return _.isUndefined(apiapp.accessLevel); }).should.be.true;
            done();
          });
        });
      });

      it('should list expected apiapp when listing by resource group', function (done) {
        createAndDeploy(function () {
          suite.execute('apiapp list %s --json', group, function (result) {
            result.exitStatus.should.equal(0);
            var output = JSON.parse(result.text);
            output.should.have.length(1);
            output[0].name.should.equal(apiappName);
            done();
          });
        });
      });

      it('should include package version and auth setting when -d flag is given', function (done) {
        createAndDeploy(function () {
          suite.execute('apiapp list -d --json', function (result) {
            result.exitStatus.should.equal(0);
            var output = JSON.parse(result.text);
            output.every(function (apiapp) { return !_.isUndefined(apiapp.package.version) && !_.isUndefined(apiapp.accessLevel); }).should.be.true;
            done();
          });
        });
      });

      it('should retrieve information about package when doing show', function (done) {
        suite.execute('apiapp show %s %s --json', group, apiappName, function (result) {
          result.exitStatus.should.equal(0);
          var output = JSON.parse(result.text);
          output.name.should.equal(apiappName);
          output.accessLevel.should.equal('Internal');
          done();
        });
      });
    });

    describe('create', function () {
      it('should deploy with package', function (done) {
        createGroupAndPlan(function (err, az) {
          if (err) { return done(err); }
          var apiappName = 'deployApp1';
          var cmd = 'apiapp create -g %s -n %s -p %s -u %s --json';
          suite.execute(cmd, az.group, apiappName, az.plan, benchPackageId, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('apiapp list --json', function (result) {
              result.exitStatus.should.equal(0);
              var apiapps = JSON.parse(result.text);
              // May be more than one if running live, but there has to be at least one.
              apiapps.length.should.be.above(0);
              apiapps.some(function (app) {
                  return app.name === apiappName && resourceGroupFromId(app.id) === az.group;
                }).should.be.true;
              done();
            });
          });
        });
      });

      it('should default to package name if name not given on command line', function (done) {
        createGroupAndPlan(function (err, az) {
          if (err) { return done(err); }
          var cmd = 'apiapp create -g %s -p %s -u %s --parameters {} --json';
          suite.execute(cmd, az.group, az.plan, benchPackageId, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('apiapp list --json', function (result) {
              result.exitStatus.should.equal(0);
              var apiapps = JSON.parse(result.text);
              // May be more than one if running live, but there has to be at least one.
              apiapps.length.should.be.above(0);
              apiapps.some(function (app) {
                  return app.name === benchPackageId && resourceGroupFromId(app.id) === az.group;
                }).should.be.true;
              done();
            });
          });
        });
      });

      it('should read parameters from file', function (done) {
        createGroupAndPlan(function (err, az) {
          if (err) { return done(err); }

          var paramFilePath = path.join(__dirname, '../../../data/apiapp-parameters.json');
          var cmd = 'apiapp create -g %s -p %s -u %s --parameters-file %s --json';
          suite.execute(cmd, az.group, az.plan, smtpPackageId, paramFilePath, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('apiapp list --json', function (result) {
              result.exitStatus.should.equal(0);
              var apiapps = JSON.parse(result.text);
              apiapps.some(function (app) {
                return app.name === 'nameFromParameterFile' && resourceGroupFromId(app.id) === az.group;
              }).should.be.true;
              done();
            });
          });
        });
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
    resourceClient.resourceGroups.createOrUpdate(groupName, { location: location}, function (err) {
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
      if (err) { return done(err); }
      return done(null, planResource.resource.id);
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
