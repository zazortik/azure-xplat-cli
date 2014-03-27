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

var path = require('path');
var util = require('util');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-group-tests';

var testLocation = 'South Central US';
var testStorageAccount = process.env['AZURE_ARM_TEST_STORAGEACCOUNT'];

var createdGroups = [];
var createdDeployments = [];

describe('arm', function () {
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
      it('should create empty group', function (done) {
        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return g.name === groupName; }).should.be.true;

            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });

      it('should create a group with a named deployment', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');

        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s -f %s -e %s -s %s -d %s --json --quiet',
          groupName, testLocation, templateFile, parameterFile, testStorageAccount, 'mydep', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return g.name === groupName; }).should.be.true;

            suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              var results = JSON.parse(listResult.text);
              results.length.should.be.above(0);

              suite.execute('group delete %s --json --quiet', groupName, function () {
                done();
              });
            });
          });
        });
      });
    });

    describe('show', function () {
      it('should create empty group', function (done) {
        var groupName = suite.generateId('xplatTestGrpShow', createdGroups, suite.isMocked);
        suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group show %s --json', groupName, function (showResult) {
            showResult.exitStatus.should.equal(0);

            var group = JSON.parse(showResult.text);
            group.name.should.equal(groupName);

            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });
    });
  });
});
