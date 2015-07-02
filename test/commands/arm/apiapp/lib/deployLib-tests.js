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
var util = require('util');

var profile = require('../../../../../lib/util/profile');
var utils = require('../../../../../lib/util/utils');
var testUtils = require('../../../../util/util');
var CLITest = require('../../../../framework/arm-cli-test');

var deployLib = require('../../../../../lib/commands/arm/apiapp/lib/deployLib');

var requiredEnvironment = [{
  name: 'AZURE_APIAPP_TEST_LOCATION',
  defaultValue: 'westus'
}];

var testPrefix = 'xplatapiappDeploy'

describe('apiapp', function () {
  describe('deployLib', function () {
    var suite;
    var location;
    var createdGroups = [];
    var subscription;
    var resourceClient;
    var originalSetTimeout = setTimeout;

    before(function(done) {
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
        // Clean up any created groups. No need to record this
        // so doing it here. No need to do this if in playback mode.
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

    describe('getMetadata', function () {
      it('should get metadata for package with no parameters', function (done) {
        var groupName = suite.generateId(testPrefix, createdGroups);
        resourceClient.resourceGroups.createOrUpdate(groupName, { location: location }, function (err) {
          should.not.exist(err);

          var deployer = new deployLib.ApiAppDeployer({
            subscription: profile.current.getSubscription(),
            package: {
              id: 'Microsoft.Azure.AppService.ApiApps.TestBench',
              fullName: 'Microsoft.Azure.AppService.ApiApps.TestBench'
            },
            resourceGroup: groupName,
            location: location
          });

          deployer.getMetadata(function (err) {
            should.not.exist(err);
            deployer.packageMetadata.metadata.dependsOn.should.have.length(0);
            deployer.packageMetadata.metadata.parameters.should.have.length(0);
            deployer.packageMetadata.metadata.microserviceId.should.equal('Microsoft.Azure.AppService.ApiApps.TestBench');
            done();
          });
        });
      });

      it('should get metadata with parameters for package with parameters', function (done) {
        var groupName = suite.generateId(testPrefix, createdGroups);
        resourceClient.resourceGroups.createOrUpdate(groupName, { location: location }, function (err) {
          should.not.exist(err);

          var deployer = new deployLib.ApiAppDeployer({
            subscription: profile.current.getSubscription(),
            package: {
              id: 'Microsoft.Azure.AppService.ApiApps.TestService',
              fullName: 'Microsoft.Azure.AppService.ApiApps.TestService'
            },
            resourceGroup: groupName,
            location: location
          });

          deployer.getMetadata(function (err) {
            should.not.exist(err);
            deployer.packageMetadata.metadata.dependsOn.should.have.length(0);
            deployer.packageMetadata.metadata.parameters.should.have.length(2);
            deployer.packageMetadata.metadata.microserviceId.should.equal('Microsoft.Azure.AppService.ApiApps.TestService');
            done();
          });
        });
      });
    });

    describe('gatherParameters', function () {
      var deployer;
      var valueProviderStub;
      var packageId = 'Microsoft.Azure.AppService.ApiApps.TestBench';

      beforeEach(function () {
        valueProviderStub = sinon.stub();
        deployer = new deployLib.ApiAppDeployer({
          subscription: profile.current.getSubscription(),
          package: {
            namespace: 'microsoft.com',
            id: packageId,
            fullName: packageId,
            version: '0.9.49'
          },
          resourceGroup: 'exampleGroup',
          location: location,
          valueProvider: valueProviderStub
        });
      });

      it('should request apiAppName if no parameters are given', function (done) {
        deployer.packageMetadata = {
          metadata: {
            parameters: []
          }
        };
        deployer.parameters = deployer.packageMetadata.metadata.parameters;

        valueProviderStub.callsArgWith(1, null, 'a name');
        deployer.gatherParameters(function (err) {
          should.not.exist(err);
          var values = deployer.parameters;
          values.should.have.length(1);
          values[0].name.should.equal('$apiAppName');
          values[0].value.should.equal('a name');

          // Should have been passed a default to value provider
          valueProviderStub.firstCall.args[0].defaultValue.should.equal(packageId);
          done();
        });
      });

      it('should get correct values for all requested parameters', function (done) {
        var expectedValues = {
          '$apiAppName': 'someName',
          'aLabel': 'the label',
          'anInt': 123
        };

        deployer.valueProvider = function valueProvider(parameterData, done) {
          done(null, expectedValues[parameterData.name]);
        };

        deployer.packageMetadata = {
          metadata: {
            parameters: [
              {
                name: 'aLabel',
              },
              {
                name: 'anInt'
              }
            ]
          }
        };
        deployer.parameters = deployer.packageMetadata.metadata.parameters;

        var expectedValues = {
          '$apiAppName': 'someName',
          'aLabel': 'the label',
          'anInt': 123
        };

        deployer.gatherParameters(function(err) {
          should.not.exist(err);
          deployer.parameters.should.have.length(3);
          deployer.parameters.reduce(
            function (acc, p) {
              acc[p.name] = p.value;
              return acc;
            }, {}).should.have.properties(expectedValues);
          done();
        });
      });

      it('should pass error to callback if valueProvider fails', function (done) {
        var parameters = [ { name: 'aLabel' }];

        valueProviderStub.onFirstCall().callsArgWith(1, null, 'app');
        valueProviderStub.onSecondCall().callsArgWith(1, new Error('failed'));

        deployer.packageMetadata = {
          metadata: {
            parameters: [ { name: 'aLabel' }]
          }
        };
        deployer.parameters = deployer.packageMetadata.metadata.parameters;

        deployer.gatherParameters(function(err) {
          should.exist(err);
          should.not.exist(deployer.parameterValues);
          err.message.should.equal('failed');
          done();
        });
      });
    });
  });
});
