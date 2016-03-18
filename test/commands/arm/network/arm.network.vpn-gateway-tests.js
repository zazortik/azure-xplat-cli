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

var testPrefix = 'arm-network-vpn-gateway-tests',
  groupName = 'xplat-test-vpn-gateway',
  location;

var gatewayProp = {
  name: 'test-vpn-gateway',
  vnetName: 'test-vnet',
  subnetName: 'GatewaySubnet',
  vnetAddressPrefix: '10.1.0.0/16',
  subnetAddressPrefix: '10.1.0.0/28',
  publicIpName: 'test-ip',
  type: 'RouteBased',
  privateIpAddress: '10.1.0.11',
  newPrivateIpAddress: '10.1.0.12',
  enableBgp: false,
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};

var localGatewayProp = {
  name: 'test-local-gateway',
  gatewayIpAddress: '10.0.0.0',
  addressPrefix: '10.0.0.0/24',
  tags: networkUtil.tags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westeurope'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5, hour = 60 * 60000;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        gatewayProp.group = groupName;
        gatewayProp.location = location;
        gatewayProp.name = suite.isMocked ? gatewayProp.name : suite.generateId(gatewayProp.name, null);
        gatewayProp.vnetName = suite.isMocked ? gatewayProp.vnetName : suite.generateId(gatewayProp.vnetName, null);
        gatewayProp.publicIpName = suite.isMocked ? gatewayProp.publicIpName : suite.generateId(gatewayProp.publicIpName, null);

        localGatewayProp.group = groupName;
        localGatewayProp.location = location;
        localGatewayProp.name = suite.isMocked ? localGatewayProp.name : suite.generateId(localGatewayProp.name, null);

        done();
      });
    });
    after(function (done) {
      // Note: VPN operations are long running and takes about 20-30 minutes to complete,
      // so we need to increase mocha timeout a lot
      this.timeout(hour);
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

    describe('vpn-gateway', function () {
      // Note: VPN operations are long running and takes about 20-30 minutes to complete,
      // so we need to increase mocha timeout a lot
      this.timeout(hour);

      it('create should create vpn gateway', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createVpnGateway(gatewayProp, suite, function() {
            done();
          });
        });
      });
      it('set should modify vpn gateway', function (done) {
        var cmd = 'network vpn-gateway set -g {group} -n {name} -a {newPrivateIpAddress} -t {newTags} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var vpnGateway = JSON.parse(result.text);
          vpnGateway.name.should.equal(gatewayProp.name);
          vpnGateway.ipConfigurations.length.should.equal(1);
          var ipConfig = vpnGateway.ipConfigurations[0];
          ipConfig.privateIPAddress.should.equal(gatewayProp.newPrivateIpAddress);
          networkUtil.shouldAppendTags(vpnGateway);
          networkUtil.shouldBeSucceeded(vpnGateway);
          done();
        });
      });
      it('set should attach default site to vpn gateway', function (done) {
        networkUtil.createLocalGateway(localGatewayProp, suite, function (localGateway) {
          var cmd = 'network vpn-gateway set -g {group} -n {name} -i {1} --json'.formatArgs(gatewayProp, localGateway.id);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var vpnGateway = JSON.parse(result.text);
            vpnGateway.gatewayDefaultSite.id.should.equal(localGateway.id);
            networkUtil.shouldBeSucceeded(vpnGateway);
            done();
          });
        });
      });
      it('set should detach default site from vpn gateway', function (done) {
        var cmd = 'network vpn-gateway set -g {group} -n {name} -d --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var vpnGateway = JSON.parse(result.text);
          vpnGateway.should.not.have.property('gatewayDefaultSite');
          networkUtil.shouldBeSucceeded(vpnGateway);
          done();
        });
      });
      it('show should display details of vpn gateway', function (done) {
        var cmd = 'network vpn-gateway show -g {group} -n {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var vpnGateway = JSON.parse(result.text);
          vpnGateway.name.should.equal(gatewayProp.name);
          done();
        });
      });
      it('list should display all vpn gateways in resource group', function (done) {
        var cmd = 'network vpn-gateway list -g {group} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var gateways = JSON.parse(result.text);
          _.some(gateways, function (gateway) {
            return gateway.name === gatewayProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete vpn gateway', function (done) {
        var cmd = 'network vpn-gateway delete -g {group} -n {name} --quiet --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network vpn-gateway show -g {group} -n {name} --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var vpnGateway = JSON.parse(result.text);
            vpnGateway.should.be.empty;
            done();
          });
        });
      });
    });
  });
});