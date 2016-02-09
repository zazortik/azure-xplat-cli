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
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-network-nsg-tests';
var tags = 'tag1=testValue1';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName, nsgName, location,
  groupPrefix = 'xplatTestGCreateNsg',
  nsgPrefix = 'xplatTestNsg';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite,
      retry = 5;
    var networkUtil = new networkTestUtil();
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        nsgName = suite.isMocked ? nsgPrefix : suite.generateId(nsgPrefix, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteGroup(groupName, suite, function (result) {
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
      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function (result) {
          var cmd = util.format('network nsg create %s %s %s -t %s --json', groupName, nsgName, location, tags).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('set should modify nsg set', function (done) {
        var cmd = util.format('network nsg set -t age=old %s %s --json', groupName, nsgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('set with no tags should remove tags from nsg ', function (done) {
        var cmd = util.format('network nsg set %s %s --json', groupName, nsgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details about nsg', function (done) {
        var cmd = util.format('network nsg show %s %s --json', groupName, nsgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(nsgName);
          done();
        });
      });
      it('list should display all nsg in resource group', function (done) {
        var cmd = util.format('network nsg list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function (res) {
            return res.name === nsgName;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete the nsg', function (done) {
        var cmd = util.format('network nsg delete %s %s --quiet --json', groupName, nsgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});