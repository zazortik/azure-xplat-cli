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
var testprefix = 'arm-cli-insights-logprofile-list-tests';
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

      describe('list', function() {
        it('should work', function (done) {
          suite.execute('insights logprofile list --json', function(result) {
            var properties = JSON.parse(result.text);

            properties.length.should.equal(1);
            properties[0].storageAccountId.should.equal(storageId);
            properties[0].serviceBusRuleId.should.equal(serviceBusRuleId);
            properties[0].locations.length.should.equal(2);
            properties[0].locations[0].should.equal('global');
            properties[0].locations[1].should.equal('eastus');
            properties[0].categories.length.should.equal(3);
            properties[0].categories[0].should.equal('Action');
            properties[0].categories[1].should.equal('Delete');
            properties[0].categories[2].should.equal('Write');
            properties[0].name.should.equal('default');
            properties[0].retentionPolicy.enabled.should.equal(false);
            properties[0].retentionPolicy.days.should.equal(0);
            
            done();
          });
        });
      });
    });
  });
});