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
var testprefix = 'arm-cli-insights-logprofile-add-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('logprofile', function() {
      var suite;
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
          storageId = '/subscriptions/1a66ce04-b633-4a0b-b2bc-a912ec8986a6/resourceGroups/fixtest2/providers/Microsoft.Storage/storageAccounts/stofixtest2';
          serviceBusRuleId = '/subscriptions/1a66ce04-b633-4a0b-b2bc-a912ec8986a6/resourceGroups/Default-ServiceBus-EastUS/providers/Microsoft.ServiceBus/namespaces/testshoeboxeastus/authorizationrules/RootManageSharedAccessKey';
          done();
        });
      });

      afterEach(function(done) {
        suite.teardownTest(done);
      });

      describe('add', function() {
        it('should work add log profile', function (done) {
          suite.execute('insights logprofile add -n default -a %s -b %s -l global,eastus -c Action,Delete -t 10 --json', storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.locations.length.should.equal(2);
            properties.locations[0].should.equal('global');
            properties.locations[1].should.equal('eastus');
            properties.categories.length.should.equal(2);
            properties.categories[0].should.equal('Action');
            properties.categories[1].should.equal('Delete');
            properties.name.should.equal('default');
            properties.retentionPolicy.enabled.should.equal(true);
            properties.retentionPolicy.days.should.equal(10);
            
            done();
          });
        });

        it('should work add log profile with default categories', function (done) {
          suite.execute('insights logprofile add -n default -a %s -b %s -l global,eastus -t 10 --json', storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.locations.length.should.equal(2);
            properties.locations[0].should.equal('global');
            properties.locations[1].should.equal('eastus');
            properties.categories.length.should.equal(3);
            properties.categories[0].should.equal('Action');
            properties.categories[1].should.equal('Delete');
            properties.categories[2].should.equal('Write');
            properties.name.should.equal('default');
            properties.retentionPolicy.enabled.should.equal(true);
            properties.retentionPolicy.days.should.equal(10);
            
            done();
          });
        });

        it('should work add log profile with default categories and no retention', function (done) {
          suite.execute('insights logprofile add -n default -a %s -b %s -l global,eastus --json', storageId, serviceBusRuleId, function(result) {
            var properties = JSON.parse(result.text);

            properties.storageAccountId.should.equal(storageId);
            properties.serviceBusRuleId.should.equal(serviceBusRuleId);
            properties.locations.length.should.equal(2);
            properties.locations[0].should.equal('global');
            properties.locations[1].should.equal('eastus');
            properties.categories.length.should.equal(3);
            properties.categories[0].should.equal('Action');
            properties.categories[1].should.equal('Delete');
            properties.categories[2].should.equal('Write');
            properties.name.should.equal('default');
            properties.retentionPolicy.enabled.should.equal(false);
            properties.retentionPolicy.days.should.equal(0);
            
            done();
          });
        });
      });
    });
  });
});