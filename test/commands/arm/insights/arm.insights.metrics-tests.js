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

var __ = require('underscore');
var should = require('should');

var util = require('util');
var fs = require('fs');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-insights-metrics-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('metrics', function() {
      var suite;
      var resourceId;
      var timeGrain;

      before(function(done) {
        suite = new CLITest(this, testprefix, requiredEnvironment);
        suite.setupSuite(done);
      });

      after(function(done) {
        suite.teardownSuite(done);
      });

      beforeEach(function(done) {
        suite.setupTest(function() {
          resourceId = '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourceGroups/Default-Web-brazilsouth/providers/microsoft.web/serverFarms/Default1';
          timeGrain = '00:01:00';
          done();
        });
      });

      afterEach(function(done) {
        suite.teardownTest(done);
      });

      describe('list', function() {
        it('should work', function (done) {
          suite.execute('insights metrics list %s %s -b %s -e %s --json', resourceId, timeGrain, '2015-04-14T17:27:00', '2015-04-14T18:27:00', function(result) {
            result.exitStatus.should.equal(0);
            
            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
                    response.length.should.equal(6);
            }
            
            __.each(response, function (record) {
              record.should.have.property('name');
              record.should.have.property('unit');
              record.should.have.property('timeGrain');
              record.should.have.property('startTime');
              record.should.have.property('endTime');
              record.should.have.property('metricValues');
              // record.should.have.property('resourceId');
              record.should.have.property('properties');
            });

            done();
          });
        });

        it('should fail if the start date is later than Now', function(done) {
          suite.execute('insights metrics list %s %s -b %s', resourceId, timeGrain, '2100-01-01T01:00:00', function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('Start date is later than Now');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        it('should fail if the end date is earlier than the start date', function(done) {
          suite.execute('insights metrics list %s %s -b %s -e %s', resourceId, timeGrain, '2015-03-02T13:00:00', '2015-03-01T13:00:00', function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('End date is earlier than start date');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        it('should fail if the end date and the start date are too far apart', function(done) {
          suite.execute('insights metrics list %s %s -b %s -e %s', resourceId, timeGrain, '2015-03-01T13:00:00', '2015-04-01T13:00:00', function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('Time range exceeds maximum allowed');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        it('should fail for shoebox metrics', function (done) {
          suite.execute('insights metrics list %s %s', '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourceGroups/myrg/providers/Microsoft.Compute/virtualMachines/my_vm', timeGrain, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('Invalid resourceId: \"/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourceGroups/myrg/providers/Microsoft.Compute/virtualMachines/my_vm\"');
            done();
          });
        });
      });
    });
  });
});