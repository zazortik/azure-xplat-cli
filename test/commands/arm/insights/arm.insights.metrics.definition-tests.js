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
var testprefix = 'arm-cli-insights-metrics-definition-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('metrics', function () {
      describe('definition', function () {
        var suite;
        var resourceId;

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
            done();
          });
        });

        afterEach(function(done) {
          suite.teardownTest(done);
        });

        describe('list', function() {
          it('should work', function(done) {
            suite.execute('insights metrics definition list %s --json', resourceId, function(result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                response.length.should.equal(6);
              }
              
              __.each(response, function (record) {
                record.should.have.property('name');
                record.should.have.property('unit');
                record.should.have.property('primaryAggregationType');
                //record.should.have.property('resourceUri');
                record.should.have.property('metricAvailabilities');
                record.should.have.property('properties');
              });

              done();
            });
          });
        });
      });
    });
  });
});