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
var testPrefix = 'arm-network-express-route-authorization-tests';
var _ = require('underscore');
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName, location,
  groupPrefix = 'xplatTestGroupExpressRoutCircuiteAuth';
var expressRCAuthPrefix = 'xplatExpressRouteAuth',
  key1 = 'abc@123',
  key2 = 'ABC@123',
  expressRCPrefix = 'xplatExpressRouteA',
  serviceProvider = 'InterCloud',
  peeringLocation = 'London',
  skuTier = 'Standard',
  skuFamily = 'MeteredData',
  tags1 = 'tag1=val1';

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
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        expressRCPrefix = suite.isMocked ? expressRCPrefix : suite.generateId(expressRCPrefix, null);
        expressRCAuthPrefix = suite.isMocked ? expressRCAuthPrefix : suite.generateId(expressRCAuthPrefix, null);
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

    describe('express-route authorization', function () {
      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createExpressRoute(groupName, expressRCPrefix, location, serviceProvider, peeringLocation, skuTier, skuFamily, tags1, suite, function () {
            var cmd = util.format('network express-route authorization create %s %s %s -k %s --json',
              groupName, expressRCPrefix, expressRCAuthPrefix, key1).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      it('set should modify express-route authorization', function (done) {
        var cmd = util.format('network express-route authorization set %s %s %s -k %s --json', groupName, expressRCPrefix, expressRCAuthPrefix, key2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details of express-route authorization', function (done) {
        var cmd = util.format('network express-route authorization show %s %s %s --json', groupName, expressRCPrefix, expressRCAuthPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(expressRCAuthPrefix);
          done();
        });
      });
      it('list should display all express-routes authorization from resource group', function (done) {
        var cmd = util.format('network express-route authorization list %s %s --json', groupName, expressRCPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function (res) {
            return res.name === expressRCAuthPrefix;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete express-route authorization', function (done) {
        var cmd = util.format('network express-route authorization delete %s %s %s -q --json', groupName, expressRCPrefix, expressRCAuthPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});