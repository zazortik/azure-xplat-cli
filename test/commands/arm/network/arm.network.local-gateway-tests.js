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

var testPrefix = 'arm-network-local-gateway-tests',
  groupName = 'xplat-test-local-gateway',
  location;

var gatewayProp = {
  name: 'test-local-gateway',
  gatewayIpAddress: '10.0.0.0',
  addressPrefix: '10.0.0.0/24',
  anotherAddressPrefix: '10.1.0.0/24',
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

        gatewayProp.group = groupName;
        gatewayProp.location = location;
        gatewayProp.name = suite.isMocked ? gatewayProp.name : suite.generateId(gatewayProp.name, null);

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

    describe('local-gateway', function () {
      it('create should create local gateway', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = 'network local-gateway create -g {group} -n {name} -l {location} -a {addressPrefix} -i {gatewayIpAddress} -t {tags} --json'
            .formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var localGateway = JSON.parse(result.text);
            localGateway.name.should.equal(gatewayProp.name);
            localGateway.gatewayIpAddress.should.equal(gatewayProp.gatewayIpAddress);
            localGateway.localNetworkAddressSpace.addressPrefixes.should.containEql(gatewayProp.addressPrefix);
            networkUtil.shouldHaveTags(localGateway);
            networkUtil.shouldBeSucceeded(localGateway);
            done();
          });
        });
      });
      it('set should modify local gateway', function (done) {
        var cmd = 'network local-gateway set -g {group} -n {name} -a {anotherAddressPrefix} -t {newTags} --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var localGateway = JSON.parse(result.text);
          localGateway.name.should.equal(gatewayProp.name);
          localGateway.localNetworkAddressSpace.addressPrefixes.should.containEql(gatewayProp.addressPrefix);
          localGateway.localNetworkAddressSpace.addressPrefixes.should.containEql(gatewayProp.anotherAddressPrefix);
          networkUtil.shouldAppendTags(localGateway);
          networkUtil.shouldBeSucceeded(localGateway);
          done();
        });
      });
      it('show should display details of local gateway', function (done) {
        var cmd = 'network local-gateway show -g {group} -n {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var localGateway = JSON.parse(result.text);
          localGateway.name.should.equal(gatewayProp.name);
          done();
        });
      });
      it('list should display all local gateways in resource group', function (done) {
        var cmd = 'network local-gateway list -g {group} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var gateways = JSON.parse(result.text);
          _.some(gateways, function (gateway) {
            return gateway.name === gatewayProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete local gateway', function (done) {
        var cmd = 'network local-gateway delete -g {group} -n {name} --quiet --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network local-gateway show -g {group} -n {name} --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var localGateway = JSON.parse(result.text);
            localGateway.should.be.empty;
            done();
          });
        });
      });
    });
  });
});