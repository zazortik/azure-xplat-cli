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

var testPrefix = 'arm-network-vpn-connection-tests',
  location;

var firstGatewayProp = {
  name: 'test-vpn-gateway-1',
  group: 'xplat-test-gateway-group-1',
  vnetName: 'test-vnet-1',
  subnetName: 'GatewaySubnet',
  vnetAddressPrefix: '10.1.0.0/16',
  subnetAddressPrefix: '10.1.0.0/28',
  publicIpName: 'test-ip-1',
  type: 'RouteBased',
  privateIpAddress: '10.1.0.11',
  enableBgp: false,
  tags: networkUtil.tags
};

var secondGatewayProp = {
  name: 'test-vpn-gateway-2',
  group: 'xplat-test-gateway-group-2',
  vnetName: 'test-vnet-2',
  subnetName: 'GatewaySubnet',
  vnetAddressPrefix: '10.2.0.0/16',
  subnetAddressPrefix: '10.2.0.0/28',
  publicIpName: 'test-ip-2',
  type: 'RouteBased',
  privateIpAddress: '10.2.0.11',
  enableBgp: false,
  tags: networkUtil.tags
};

var connectionProp = {
  name: 'test-vpn-connection',
  type: 'Vnet2Vnet',
  sharedKey: 'abc123',
  newSharedKey: 'xyz987',
  keyLength: 6,
  routingWeight: 22,
  newRoutingWeight: 33,
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 10, hour = 60 * 60000;
    testUtils.TIMEOUT_INTERVAL = 20000;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;

        firstGatewayProp.location = location;
        firstGatewayProp.group = suite.isMocked ? firstGatewayProp.group: suite.generateId(firstGatewayProp.group, null);
        firstGatewayProp.name = suite.isMocked ? firstGatewayProp.name: suite.generateId(firstGatewayProp.name, null);
        firstGatewayProp.vnetName = suite.isMocked ? firstGatewayProp.vnetName: suite.generateId(firstGatewayProp.vnetName, null);
        firstGatewayProp.publicIpName = suite.isMocked ? firstGatewayProp.publicIpName: suite.generateId(firstGatewayProp.publicIpName, null);

        secondGatewayProp.location = location;
        secondGatewayProp.group = suite.isMocked ? secondGatewayProp.group: suite.generateId(secondGatewayProp.group, null);
        secondGatewayProp.name = suite.isMocked ? secondGatewayProp.name: suite.generateId(secondGatewayProp.name, null);
        secondGatewayProp.vnetName = suite.isMocked ? secondGatewayProp.vnetName: suite.generateId(secondGatewayProp.vnetName, null);
        secondGatewayProp.publicIpName = suite.isMocked ? secondGatewayProp.publicIpName: suite.generateId(secondGatewayProp.publicIpName, null);

        connectionProp.location = location;
        connectionProp.name = suite.isMocked ? connectionProp.name: suite.generateId(connectionProp.name, null);
        connectionProp.group = firstGatewayProp.group;
        connectionProp.gatewayName1 = firstGatewayProp.name;
        connectionProp.gatewayName2 = secondGatewayProp.name;
        connectionProp.gatewayGroup1 = firstGatewayProp.group;
        connectionProp.gatewayGroup2 = secondGatewayProp.group;

        done();
      });
    });
    after(function (done) {
      // Note: VPN operations are long running and takes about 20-30 minutes to complete,
      // so we need to increase mocha timeout a lot
      this.timeout(hour);

      networkUtil.deleteGroup(firstGatewayProp.group, suite, function () {
        networkUtil.deleteGroup(secondGatewayProp.group, suite, function () {
          suite.teardownSuite(done);
        });
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('vpn-connection', function () {
      // Note: VPN operations are long running and takes about 20-30 minutes to complete,
      // so we need to increase mocha timeout a lot
      this.timeout(hour);

      it('create first gateway should create vpn gateway in resource group', function (done) {
        networkUtil.createGroup(firstGatewayProp.group, location, suite, function () {
          networkUtil.createVpnGateway(firstGatewayProp, suite, function() {
            done();
          });
        });
      });
      it('create second gateway should create vpn gateway in another resource group', function (done) {
        networkUtil.createGroup(secondGatewayProp.group, location, suite, function () {
          networkUtil.createVpnGateway(secondGatewayProp, suite, function() {
            done();
          });
        });
      });
      it('create connection should create connection between vpn gateways in different resource groups', function (done) {
        var cmd = 'network vpn-connection create -g {group} -n {name} -l {location} -i {gatewayName1} -r {gatewayGroup1} -e {gatewayName2} -m {gatewayGroup2} -y {type} -w {routingWeight} -k {sharedKey} -t {tags} --json'
          .formatArgs(connectionProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var connection = JSON.parse(result.text);
          connection.name.should.equal(connectionProp.name);
          connection.connectionType.should.equal(connectionProp.type);
          connection.routingWeight.should.equal(connectionProp.routingWeight);
          networkUtil.shouldHaveTags(connection);
          networkUtil.shouldBeSucceeded(connection);
          done();
        });
      });
      it('set should modify connection', function (done) {
        var cmd = 'network vpn-connection set -g {group} -n {name} -w {newRoutingWeight} -t {newTags} --json'
          .formatArgs(connectionProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var connection = JSON.parse(result.text);
          connection.name.should.equal(connectionProp.name);
          connection.routingWeight.should.equal(connectionProp.newRoutingWeight);
          networkUtil.shouldAppendTags(connection);
          networkUtil.shouldBeSucceeded(connection);
          done();
        });
      });
      it('show should display details of connection', function (done) {
        var cmd = 'network vpn-connection show -g {group} -n {name} --json'.formatArgs(connectionProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var connection = JSON.parse(result.text);
          connection.name.should.equal(connectionProp.name);
          done();
        });
      });
      it('list should display all connections in resource group', function (done) {
        var cmd = 'network vpn-connection list -g {gatewayGroup1} --json'.formatArgs(connectionProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var connections = JSON.parse(result.text);
          _.some(connections, function (connection) {
            return connection.name === connectionProp.name;
          }).should.be.true;
          done();
        });
      });
      it('shared-key set should modify connection shared key value', function (done) {
        var cmd = 'network vpn-connection shared-key set -g {group} -n {name} -k {newSharedKey} --json'.formatArgs(connectionProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('shared-key show should display connection shared key value', function (done) {
        var cmd = 'network vpn-connection shared-key show -g {group} -n {name} --json'.formatArgs(connectionProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var sharedKey = JSON.parse(result.text);
          sharedKey.should.have.property('value');
          done();
        });
      });
      it('delete should delete connection', function (done) {
        var cmd = 'network vpn-connection delete -g {group} -n {name} --quiet --json'.formatArgs(connectionProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network vpn-connection show -g {group} -n {name} --json'.formatArgs(connectionProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var connection = JSON.parse(result.text);
            connection.should.be.empty;
            done();
          });
        });
      });
    });
  });
});