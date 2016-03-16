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
var _ = require('underscore');

var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();

var testPrefix = 'arm-network-route-table-tests',
  groupName = 'xplat-test-route-table',
  location;

var tableProp = {
  name: 'test-route-table',
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;
    var networkUtil = new NetworkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        tableProp.group = groupName;
        tableProp.location = location;
        tableProp.name = suite.isMocked ? tableProp.name : suite.generateId(tableProp.name, null);

        done();
      });
    });
    after(function (done) {
      networkUtil.deleteGroup(groupName, suite, function () {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('route-table', function () {
      it('create should create route table', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = 'network route-table create -g {group} -n {name} -l {location} -t {tags} --json'.formatArgs(tableProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var routeTable = JSON.parse(result.text);
            routeTable.name.should.equal(tableProp.name);
            networkUtil.shouldHaveTags(routeTable);
            networkUtil.shouldBeSucceeded(routeTable);
            done();
          });
        });
      });
      it('set should modify route table', function (done) {
        var cmd = 'network route-table set -g {group} -n {name} -t {newTags} --json'.formatArgs(tableProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var routeTable = JSON.parse(result.text);
          routeTable.name.should.equal(tableProp.name);
          networkUtil.shouldBeSucceeded(routeTable);
          networkUtil.shouldAppendTags(routeTable);
          done();
        });
      });
      it('show should display details of route table', function (done) {
        var cmd = 'network route-table show -g {group} -n {name} --json'.formatArgs(tableProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var routeTable = JSON.parse(result.text);
          routeTable.name.should.equal(tableProp.name);
          done();
        });
      });
      it('list should display all route tables in resource group', function (done) {
        var cmd = 'network route-table list -g {group} --json'.formatArgs(tableProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var tables = JSON.parse(result.text);
          _.some(tables, function (table) {
            return table.name === tableProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete route table', function (done) {
        var cmd = 'network route-table delete -g {group} -n {name} --quiet --json'.formatArgs(tableProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network route-table show -g {group} -n {name} --json'.formatArgs(tableProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var routeTable = JSON.parse(result.text);
            routeTable.should.be.empty;
            done();
          });
        });
      });
    });
  });
});
