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

var __ = require("underscore");
var should = require('should');

var util = require('util');
var fs = require('fs');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-role-assignment-audit-tests';
var utils = require('../../../../lib/util/utils');

var insightsUtils = require('../../../../lib/commands/arm/insights/insights.utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('role assignment', function () {
    describe('changelog', function () {
      var suite;
      var resourceId;
      
      before(function (done) {
        suite = new CLITest(this, testprefix, requiredEnvironment);
        suite.setupSuite(done);
      });
      
      after(function (done) {
        suite.teardownSuite(done);
      });
      
      beforeEach(function (done) {
        suite.setupTest(function () {
          done();
        });
      });
      
      afterEach(function (done) {
        suite.teardownTest(done);
      });
      
      describe('list', function () {
        it('should work', function (done) {
          var end = new Date(); // today
          var start = new Date();
          start.setHours(end.getHours() - 1);
          suite.execute('role assignment changelog list -b %s -e %s --json', start.toISOString(), end.toISOString(),function (result) {
            result.exitStatus.should.equal(0);
           
            var response = JSON.parse(result.text);
            response.length.should.be.above(0);
           
            done();
          });
        });
      });
    });
  });
});