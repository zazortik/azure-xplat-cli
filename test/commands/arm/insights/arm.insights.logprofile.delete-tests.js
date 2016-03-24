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
var testprefix = 'arm-cli-insights-logprofile-delete-tests';
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

      before(function(done) {
        suite = new CLITest(this, testprefix, requiredEnvironment);
        suite.setupSuite(done);
      });

      after(function(done) {
        suite.teardownSuite(done);
      });

      beforeEach(function(done) {
        suite.setupTest(function() {
          done();
        });
      });

      afterEach(function(done) {
        suite.teardownTest(done);
      });

      describe('delete', function() {
        it('should work', function (done) {
          suite.execute('insights logprofile delete -n default', function(result) {
            done();
          });
        });
      });
    });
  });
});