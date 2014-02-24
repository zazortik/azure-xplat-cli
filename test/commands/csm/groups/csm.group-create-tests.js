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

var CLITest = require('../../../framework/csm-cli-test');
var testprefix = 'csm-cli-groups-tests';

var testLocation = 'South Central US';

describe('csm', function () {
  describe('group', function () {
    var suite;

    before(function (done) {
      suite = new CLITest(testprefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('create', function () {
      var createdGroups = [];

      it('should create empty group', function (done) {
        var groupName = suite.generateId('xplatTestGroup', createdGroups);
        suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);

            var groups = JSON.parse(listResult.text);
            groups.some(function (g) { return g.name === groupName; }).should.be.true;

            suite.execute('group delete %s --json', groupName, function () {
              done();
            });
          });
        });
      });
    });
  });
});