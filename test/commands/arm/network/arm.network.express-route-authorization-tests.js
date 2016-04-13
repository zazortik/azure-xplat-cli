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
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();
var groupName, location, encryptedKey1,
  groupPrefix = 'xplatTestGroupExpressRouteAuth',
  auth = {
    expressRCName: 'xplatExpressRoute',
    serviceProvider: 'InterCloud',
    peeringLocation: 'London',
    bandwidth: 50,
    skuTier: 'Standard',
    skuFamily: 'MeteredData',
    tags: networkUtil.tags,
    name: 'xplatExpressRouteAuth',
    key: 'abc@123',
    newKey: 'ABC@123'
  };

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite,
      retry = 5;
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);

        auth.location = location;
        auth.group = groupName;
        auth.expressRCName = suite.isMocked ? auth.expressRCName : suite.generateId(auth.expressRCName, null);
        auth.name = suite.isMocked ? auth.name : suite.generateId(auth.name, null);
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
          networkUtil.createExpressRoute(auth, suite, function () {
            var cmd = 'network express-route authorization create {group} {expressRCName} {name} -k {key} --json'.formatArgs(auth);
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              var auth = JSON.parse(result.text);
              auth.name.should.equal(auth.name);
              encryptedKey1 = auth.authorizationKey;
              networkUtil.shouldBeSucceeded(auth);
              done();
            });
          });
        });
      });
      it('set should modify express-route authorization', function (done) {
        var cmd = 'network express-route authorization set {group} {expressRCName} {name} -k {newKey} --json'.formatArgs(auth);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var auth = JSON.parse(result.text);
          auth.name.should.equal(auth.name);
          (encryptedKey1 === auth.authorizationKey).should.be.false;
          networkUtil.shouldBeSucceeded(auth);
          done();
        });
      });
      it('show should display details of express-route authorization', function (done) {
        var cmd = 'network express-route authorization show {group} {expressRCName} {name} --json'.formatArgs(auth);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var auth = JSON.parse(result.text);
          auth.name.should.equal(auth.name);
          done();
        });
      });
      it('list should display all express-routes authorization from resource group', function (done) {
        var cmd = 'network express-route authorization list {group} {expressRCName} --json'.formatArgs(auth);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var authorization = JSON.parse(result.text);
          _.some(authorization, function (item) {
            return item.name === auth.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete express-route authorization', function (done) {
        var cmd = 'network express-route authorization delete {group} {expressRCName} {name} -q --json'.formatArgs(auth);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network express-route authorization show {group} {expressRCName} {name} --json'.formatArgs(auth);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var authorization = JSON.parse(result.text);
            authorization.should.be.empty;
            done();
          });
        });
      });
    });
  });
});