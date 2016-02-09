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
var networkTestUtil = require('../../../util/networkTestUtil');

var location,
  testPrefix = 'arm-network-lb-tests',
  groupName = 'xplat-test-lb',
  lbName = 'test-lb';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;
    var networkUtil = new networkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        lbName = suite.isMocked ? lbName : suite.generateId(lbName, null);
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

    describe('lb', function () {
      it('create should create load balancer', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = util.format('network lb create -g %s -n %s -l %s -t %s --json', groupName, lbName, location, networkUtil.tags);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var lb = JSON.parse(result.text);
            lb.name.should.equal(lbName);
            done();
          });
        });
      });
      it('set should modify load balancer', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = util.format('network lb set -g %s -n %s -t %s --json', groupName, lbName, networkUtil.newTags);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var lb = JSON.parse(result.text);
            lb.name.should.equal(lbName);
            networkUtil.shouldAppendTags(lb);
            done();
          });
        });
      });
      it('show should display details of load balancer', function (done) {
        var cmd = util.format('network lb show -g %s -n %s --json', groupName, lbName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var lb = JSON.parse(result.text);
          lb.name.should.equal(lbName);
          done();
        });
      });
      it('list should display all load balancers in resource group', function (done) {
        var cmd = util.format('network lb list -g %s --json', groupName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var lbs = JSON.parse(result.text);
          _.some(lbs, function (lb) {
            return lb.name === lbName;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete load balancer', function (done) {
        var cmd = util.format('network lb delete -g %s -n %s --quiet --json', groupName, lbName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('network lb show -g %s -n %s --json', groupName, lbName);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var lb = JSON.parse(result.text);
            lb.should.be.empty;
            done();
          });
        });
      });
    });

  });
});