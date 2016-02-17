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

var testPrefix = 'arm-network-nsg-tests',
  groupName = 'xplat-test-nsg',
  location;

var nsgProp = {
  name: 'test-nsg',
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
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

        nsgProp.group = groupName;
        nsgProp.location = location;
        nsgProp.name = suite.isMocked ? nsgProp.name : suite.generateId(nsgProp.name, null);

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

    describe('nsg', function () {
      it('create should create nsg', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = 'network nsg create -g {group} -n {name} -l {location} -t {tags} --json'.formatArgs(nsgProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var nsg = JSON.parse(result.text);
            nsg.name.should.equal(nsg.name);
            networkUtil.shouldHaveTags(nsg);
            networkUtil.shouldBeSucceeded(nsg);
            done();
          });
        });
      });
      it('set should modify nsg', function (done) {
        var cmd = 'network nsg set -g {group} -n {name} -t {newTags} --json'.formatArgs(nsgProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nsg = JSON.parse(result.text);
          nsg.name.should.equal(nsg.name);
          networkUtil.shouldAppendTags(nsg);
          networkUtil.shouldBeSucceeded(nsg);
          done();
        });
      });
      it('show should display details about nsg', function (done) {
        var cmd = 'network nsg show -g {group} -n {name} --json'.formatArgs(nsgProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nsg = JSON.parse(result.text);
          nsg.name.should.equal(nsg.name);
          done();
        });
      });
      it('list should display all nsg in resource group', function (done) {
        var cmd = 'network nsg list -g {group} --json'.formatArgs(nsgProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nsgs = JSON.parse(result.text);
          _.some(nsgs, function (nsg) {
            return nsg.name === nsgProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete nsg', function (done) {
        var cmd = 'network nsg delete -g {group} -n {name} --quiet --json'.formatArgs(nsgProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network nsg show -g {group} -n {name} --json'.formatArgs(nsgProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var nsg = JSON.parse(result.text);
            nsg.should.be.empty;
            done();
          });
        });
      });
    });
  });
});