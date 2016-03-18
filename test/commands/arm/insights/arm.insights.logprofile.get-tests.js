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
var testprefix = 'arm-cli-insights-diagnostic-get-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('diagnostic', function() {
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
          resourceId = '/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/insights-integration/providers/test.shoebox/testresources2/0000000000eastusR2';
          done();
        });
      });

      afterEach(function(done) {
        suite.teardownTest(done);
      });

      describe('get', function() {
        it('should work', function (done) {
          suite.execute('insights diagnostic get -i %s --json', resourceId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal("/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/Default-Storage-EastUS/providers/Microsoft.ClassicStorage/storageAccounts/testshoeboxeastus");
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(true);
            properties.metrics[0].timeGrain._milliseconds.should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal("TestLog1");
            properties.logs[0].enabled.should.equal(true);
            properties.logs[1].category.should.equal("TestLog2");
            properties.logs[1].enabled.should.equal(true);
            
            done();
          });
        });
      });
    });
  });
});