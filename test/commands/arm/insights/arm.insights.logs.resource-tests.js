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
var fs = require('fs');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-insights-logs-resource-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_ARM_TEST_SQL_RESOURCE_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_ARM_TEST_WEBSITES_RESOURCE_LOCATION', defaultValue: 'South Central US' }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('logs', function() {
      describe('resource', function() {
        var suite;
        var testGroupLocation;
        var testSqlResourceLocation;
        var testWebsitesResourceLocation;
        var resourceId = '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourceGroups/Default-Web-brazilsouth/providers/microsoft.web/serverFarms/Default1/events/2fc383ab-a60b-4334-abb2-ef47ce36f112/ticks/635635968009558815';

        before(function(done) {
          suite = new CLITest(testprefix, requiredEnvironment);
          suite.setupSuite(done);
        });

        after(function(done) {
          suite.teardownSuite(done);
        });

        beforeEach(function(done) {
          suite.setupTest(function() {
            testGroupLocation = process.env['AZURE_ARM_TEST_LOCATION'];
            testSqlResourceLocation = process.env['AZURE_ARM_TEST_SQL_RESOURCE_LOCATION'];
            testWebsitesResourceLocation = process.env['AZURE_ARM_TEST_WEBSITES_RESOURCE_LOCATION'];
            done();
          });
        });

        afterEach(function(done) {
          suite.teardownTest(done);
        });

        describe('list', function () {
          it('should work without options', function (done) {
            suite.execute('insights logs resource list %s', resourceId, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });

          it('should work', function(done) {
            suite.execute('insights logs resource list %s -s %s -e %s -d', resourceId, '2015-04-02T11:06:00', '2015-04-02T12:06:00', function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });

          it('should fail if the start date is later than Now', function(done) {
            suite.execute('insights logs resource list %s -s %s -d', resourceId, '2100-01-01T01:00:00', function(result) {
              result.exitStatus.should.equal(1);
              var expectedError = util.format('Start date is later than Now');
              result.errorText.should.include(expectedError);
              done();
            });
          });

          it('should fail if the end date is earlier than the start date', function(done) {
            suite.execute('insights logs resource list %s -s %s -e %s -d', resourceId, '2015-03-02T13:00:00', '2015-03-01T13:00:00', function(result) {
              result.exitStatus.should.equal(1);
              var expectedError = util.format('End date is earlier than start date');
              result.errorText.should.include(expectedError);
              done();
            });
          });

          it('should fail if the end date and the start date are too far apart', function(done) {
            suite.execute('insights logs resource list %s -s %s -e %s -d', resourceId, '2015-03-01T13:00:00', '2015-04-01T13:00:00', function(result) {
              result.exitStatus.should.equal(1);
              var expectedError = util.format('Time range exceeds maximum allowed');
              result.errorText.should.include(expectedError);
              done();
            });
          });
        });
      });
    });
  });
});