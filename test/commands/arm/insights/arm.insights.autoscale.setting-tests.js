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
var testprefix = 'arm-cli-insights-autoscale-setting-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('autoscale', function () {
      describe('setting', function() {
        var suite;
        var resourceGroup;
        var settingName;
        var resourceId;
        var profiles;

        before(function(done) {
          suite = new CLITest(this, testprefix, requiredEnvironment);
          suite.setupSuite(done);
        });

        after(function(done) {
          suite.teardownSuite(done);
        });

        beforeEach(function(done) {
          suite.setupTest(function () {
            resourceGroup = 'Default-Web-BrazilSouth';
            settingName = 'Default1-Default-Web-BrazilSouth';
            resourceId = '/subscriptions/3b94e3c2-9f5b-4a1e-9999-3e0945b88aa9/resourceGroups/Default-Web-WestUS/providers/microsoft.web/serverFarms/DefaultServerFarm';
            profiles = '[{"name":"adios","capacity":{"default":"1","minimum":"1","maximum":"10"},"fixedDate":{"start":"2015-03-05T14:00:00.000Z","end":"2015-03-05T14:30:00.000Z","timeZone":"GMT"},"recurrence":null,"rules":[{"metricTrigger":{"metricName":"Requests","metricResourceUri":"/subscriptions/3b94e3c2-9f5b-4a1e-9999-3e0945b88aa9/resourceGroups/Default-Web-WestUS/providers/Microsoft.Web/sites/misitiooelnuestro","operator":"GreaterThan","statistic":"Average","threshold":10,"timeAggregation":"Average","timeGrain":"PT1M","timeWindow":"PT5M"},"scaleAction":{"cooldown":"PT5M","direction":"Increase","type":"ChangeCount","value":"2"}}]}]';

            done();
          });
        });

        afterEach(function(done) {
          suite.teardownTest(done);
        });

        describe('list', function() {
          it('should work with rg only', function(done) {
            suite.execute('insights autoscale setting list %s --json', resourceGroup, function(result) {
            result.exitStatus.should.equal(0);

            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
            response.length.should.equal(1);
            }

            var record = response[0];
            record.name.should.equal(settingName);

            done();
            });
          });
      
          it('should work with setting name', function (done) {
            suite.execute('insights autoscale setting list %s -n %s --json', resourceGroup, settingName, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
              response.length.should.equal(1);
              }

              var record = response[0];
              record.name.should.equal(settingName);

              done();
            });
          });
        });

        describe('set', function() {
          it('should create a setting', function(done) {
            // Assume profile is created
            suite.execute('insights autoscale setting set %s %s %s -i %s -a %s --json', 'MySetting', 'West US', 'Default-Web-WestUS', resourceId, profiles, function(result) {
              result.exitStatus.should.equal(0);

              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                      response.statusCode.should.equal(200);
              }

              done();
            });
          });
        });
      });
    });
  });
});