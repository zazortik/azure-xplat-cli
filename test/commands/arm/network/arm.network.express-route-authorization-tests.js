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

var testPrefix = 'arm-network-express-route-authorization-tests',
  groupName = 'xplat-test-express-route-circuit-auth',
  location,
  encryptedKey1;

var circuitProp = {
  name: 'test-circuit',
  serviceProviderName: 'InterCloud',
  peeringLocation: 'London',
  bandwidthInMbps: 100,
  skuTier: 'Standard',
  skuFamily: 'MeteredData',
  tags: networkUtil.tags
};

var authProp = {
  name: 'test-auth',
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
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        circuitProp.group = groupName;
        circuitProp.location = location;
        circuitProp.name = suite.isMocked ? circuitProp.name : suite.generateId(circuitProp.name, null);

        authProp.group = groupName;
        authProp.location = location;
        authProp.circuitName = circuitProp.name;
        authProp.name = suite.isMocked ? authProp.name : suite.generateId(authProp.name, null);

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
      it('create should create express route authorization', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createExpressRouteCircuit(circuitProp, suite, function () {
            var cmd = 'network express-route authorization create -g {group} -c {circuitName} -n {name} -k {key} --json'.formatArgs(authProp);
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
      it('set should modify express route authorization', function (done) {
        var cmd = 'network express-route authorization set -g {group} -c {circuitName} -n {name} -k {newKey} --json'.formatArgs(authProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var auth = JSON.parse(result.text);
          auth.name.should.equal(auth.name);
          (encryptedKey1 === auth.authorizationKey).should.be.true;
          networkUtil.shouldBeSucceeded(auth);
          done();
        });
      });
      it('show should display details of express route authorization', function (done) {
        var cmd = 'network express-route authorization show -g {group} -c {circuitName} -n {name} --json'.formatArgs(authProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var auth = JSON.parse(result.text);
          auth.name.should.equal(auth.name);
          done();
        });
      });
      it('list should display all express route authorizations in resource group', function (done) {
        var cmd = 'network express-route authorization list -g {group} -c {circuitName} --json'.formatArgs(authProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var auths = JSON.parse(result.text);
          _.some(auths, function (auth) {
            return auth.name === authProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete express route authorization', function (done) {
        var cmd = 'network express-route authorization delete -g {group} -c {circuitName} -n {name} --quiet --json'.formatArgs(authProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network express-route authorization show -g {group} -c {circuitName} -n {name} --json'.formatArgs(authProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var auth = JSON.parse(result.text);
            auth.should.be.empty;
            done();
          });
        });
      });
    });
  });
});