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
var testprefix = 'arm-network-lb-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName,
  location,
  groupPrefix = 'xplatTestGCreateLb',
  publicipPrefix = 'xplatTestIpLb',
  lbPrefix = 'xplattestlb',
  tag1 = 'tag',
  tag2 = 'tag2',
  value1 = 'val';
var publicIpId;
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
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
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        lbPrefix = suite.isMocked ? lbPrefix : suite.generateId(lbPrefix, null);
        tag1 = suite.isMocked ? tag1 : suite.generateId(tag1, null);
        tag2 = suite.isMocked ? tag2 : suite.generateId(tag2, null);
        value1 = suite.isMocked ? value1 : suite.generateId(value1, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteUsedGroup(groupName, suite, function () {
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
      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = util.format('network lb create %s %s -l %s -t %s=;%s=%s --json', groupName, lbPrefix, location, tag1, tag2, value1).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });

        });
      });
      it('show should display details of load balancer', function (done) {
        var cmd = util.format('network lb show %s %s --json', groupName, lbPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(lbPrefix);
          done();
        });
      });
      it('list should display all load balancers in resource group', function (done) {
        var cmd = util.format('network lb list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function (res) {
            return res.name === lbPrefix;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete load balancer', function (done) {
        var cmd = util.format('network lb delete %s %s --quiet --json', groupName, lbPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});