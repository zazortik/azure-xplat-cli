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
var testprefix = 'arm-cli-insights-diagnostic-set-tests';
var utils = require('../../../../lib/util/utils');
var moment = require('moment');

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
      var storageId;
      var serviceBusRuleId;

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
          storageId = '/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/insights-integration/providers/microsoft.classicstorage/storageAccounts/sbeastus1a1';
          serviceBusRuleId = '/subscriptions/4b9e8510-67ab-4e9a-95a9-e2f1e570ea9c/resourceGroups/Default-ServiceBus-EastUS/providers/Microsoft.ServiceBus/namespaces/tseastus/authorizationrules/RootManageSharedAccessKey';
          done();
        });
      });

      afterEach(function(done) {
        suite.teardownTest(done);
      });

      describe('set', function() {
        it('should work enable all', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s -b %s -e true --json', resourceId, storageId, serviceBusRuleId, function (result) {
            (result.error == null).should.be.ok;

            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(true);
            moment.duration(properties.metrics[0].timeGrain).asMilliseconds().should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal('TestLog1');
            properties.logs[0].enabled.should.equal(true);
            properties.logs[1].category.should.equal('TestLog2');
            properties.logs[1].enabled.should.equal(true);
            
            done();
          });
        });

        it('should work disable all', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s -b %s -e false --json', resourceId, storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(false);
            moment.duration(properties.metrics[0].timeGrain).asMilliseconds().should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal('TestLog1');
            properties.logs[0].enabled.should.equal(false);
            properties.logs[1].category.should.equal('TestLog2');
            properties.logs[1].enabled.should.equal(false);
            
            done();
          });
        });

        it('should work enable timegrain only', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s -b %s -e true -t PT1M --json', resourceId, storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(true);
            moment.duration(properties.metrics[0].timeGrain).asMilliseconds().should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal('TestLog1');
            properties.logs[0].enabled.should.equal(false);
            properties.logs[1].category.should.equal('TestLog2');
            properties.logs[1].enabled.should.equal(false);
            
            done();
          });
        });

        it('should work enable one category only', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s -b %s -e true -c TestLog2 --json', resourceId, storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(true);
            moment.duration(properties.metrics[0].timeGrain).asMilliseconds().should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal('TestLog1');
            properties.logs[0].enabled.should.equal(false);
            properties.logs[1].category.should.equal('TestLog2');
            properties.logs[1].enabled.should.equal(true);
            
            done();
          });
        });

        it('should work disable timegrain only', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s -b %s -e false -t PT1M --json', resourceId, storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(false);
            moment.duration(properties.metrics[0].timeGrain).asMilliseconds().should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal('TestLog1');
            properties.logs[0].enabled.should.equal(false);
            properties.logs[1].category.should.equal('TestLog2');
            properties.logs[1].enabled.should.equal(true);
            
            done();
          });
        });

        it('should work enable timegrain and category', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s -b %s -e true -t PT1M -c TestLog1,TestLog2 --json', resourceId, storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.metrics.length.should.equal(1);
            properties.metrics[0].enabled.should.equal(true);
            moment.duration(properties.metrics[0].timeGrain).asMilliseconds().should.equal(60000);
            properties.logs.length.should.equal(2);
            properties.logs[0].category.should.equal('TestLog1');
            properties.logs[0].enabled.should.equal(true);
            properties.logs[1].category.should.equal('TestLog2');
            properties.logs[1].enabled.should.equal(true);
            
            done();
          });
        });

        it('should fail if resourceId is missing', function (done) {
          suite.execute('insights diagnostic set -a %s -e true', storageId, function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('The resourceId parameter is required');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        it('should fail if enable is missing', function (done) {
          suite.execute('insights diagnostic set -i %s -a %s', resourceId, storageId, function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('The enabled parameter is required');
            result.errorText.should.include(expectedError);
            done();
          });
        });
      });
    });
  });
});