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
var testprefix = 'arm-network-vpn-connection-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName, location,
  groupPrefix = 'xplatTestGroupGatewayCon',
  gatewayPrefix1 = 'xplatvpngatewayI',
  gatewayPrefix2 = 'xplatvpngatewayII',
  publicipPrefix1 = 'xplatTestIpGatewayI',
  publicipPrefix2 = 'xplatTestIpGatewayII',
  vnetPrefix1 = 'xplatTestVnetI',
  vnetPrefix2 = 'xplatTestVnetII',
  vnetAddressPrefix1 = '10.1.0.0/16',
  vnetAddressPrefix2 = '10.2.0.0/16',
  subnetprefix1 = 'GatewaySubnet',
  subnetprefix2 = 'GatewaySubnet',
  subnetAddressPrefix1 = '10.1.0.0/28',
  subnetAddressPrefix2 = '10.2.0.0/28',
  privateIpAddress1 = '10.1.0.11',
  privateIpAddress2 = '10.2.0.11',
  tags1 = 'tag1=val1',
  tags2 = 'tag2=val2',
  enablebgp = 'false',
  gatewayType = 'RouteBased';
var gatewayConnPrefix = 'xplatTestGatewayConn',
  connType = 'Vnet2Vnet',
  sharedKey = 'abc123',
  sharedKey2 = 'xyz987',
  routingWeight = 22,
  keyLength = 3,
  connTag = 'connTag1=connVal1';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite,
      timeout,
      retry = 10;
    testUtils.TIMEOUT_INTERVAL = 20000;
    var networkUtil = new networkTestUtil();
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        gatewayConnPrefix = suite.isMocked ? gatewayConnPrefix : suite.generateId(gatewayConnPrefix, null);
        gatewayPrefix1 = suite.isMocked ? gatewayPrefix1 : suite.generateId(gatewayPrefix1, null);
        gatewayPrefix2 = suite.isMocked ? gatewayPrefix2 : suite.generateId(gatewayPrefix2, null);
        vnetPrefix1 = suite.isMocked ? vnetPrefix1 : suite.generateId(vnetPrefix1, null);
        vnetPrefix2 = suite.isMocked ? vnetPrefix2 : suite.generateId(vnetPrefix2, null);
        publicipPrefix1 = suite.isMocked ? publicipPrefix1 : suite.generateId(publicipPrefix1, null);
        publicipPrefix2 = suite.isMocked ? publicipPrefix2 : suite.generateId(publicipPrefix2, null);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    after(function (done) {
      setTimeout(function () {
        networkUtil.deleteUsedGroup(groupName, suite, function () {
          suite.teardownSuite(done);
        });
      }, timeout);
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('vpn-connection', function () {
      it('create first gateway should pass', function (done) {
        this.timeout(this.gatewaytimeout);
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createVnetWithAddress(groupName, vnetPrefix1, location, vnetAddressPrefix1, suite, function () {
            networkUtil.createSubnetWithAddress(groupName, vnetPrefix1, subnetprefix1, subnetAddressPrefix1, suite, function () {
              networkUtil.createPublicIp(groupName, publicipPrefix1, location, suite, function () {
                networkUtil.createGateway(groupName, gatewayPrefix1, location, gatewayType, publicipPrefix1, vnetPrefix1, subnetprefix1, privateIpAddress1, enablebgp, tags1, suite, function () {
                  done();
                });
              });
            });
          });
        });
      });
      it('create second gateway and create gateway connection should pass', function (done) {
        this.timeout(this.gatewaytimeout);
        networkUtil.createVnetWithAddress(groupName, vnetPrefix2, location, vnetAddressPrefix2, suite, function () {
          networkUtil.createSubnetWithAddress(groupName, vnetPrefix2, subnetprefix2, subnetAddressPrefix2, suite, function () {
            networkUtil.createPublicIp(groupName, publicipPrefix2, location, suite, function () {
              networkUtil.createGateway(groupName, gatewayPrefix2, location, gatewayType, publicipPrefix2, vnetPrefix2, subnetprefix2, privateIpAddress2, enablebgp, tags2, suite, function () {
                var cmd = util.format('network vpn-connection create -g %s -n %s -l %s -i %s -e %s -y %s -k %s -t %s --json', groupName, gatewayConnPrefix, location, gatewayPrefix1, gatewayPrefix2, connType, sharedKey, connTag).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should modify gateway connection', function (done) {
        var cmd = util.format('network vpn-connection set -g %s -n %s -w %s --json', groupName, gatewayConnPrefix, routingWeight).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details of gateway connection', function (done) {
        var cmd = util.format('network vpn-connection show -g %s -n %s --json', groupName, gatewayConnPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(gatewayConnPrefix);
          done();
        });
      });
      it('list should display all gateway connections in a given resource group', function (done) {
        var cmd = util.format('network vpn-connection list -g %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function (res) {
            return res.name === gatewayConnPrefix;
          }).should.be.true;
          done();
        });
      });
      it('shared-key set should modify gateway connection shared key value', function (done) {
        var cmd = util.format('network vpn-connection shared-key set -g %s -n %s -k %s --json', groupName, gatewayConnPrefix, sharedKey2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('shared-key show should should display gateway connection shared key value', function (done) {
        var cmd = util.format('network vpn-connection shared-key show -g %s -n %s --json', groupName, gatewayConnPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('delete should delete gateway connection', function (done) {
        var cmd = util.format('network vpn-connection delete %s %s --json --quiet', groupName, gatewayConnPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});