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
var testprefix = 'arm-network-vpn-gateway-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName, location,
  groupPrefix = 'xplatTestGroupVnetGateway2',
  gatewayPrefix = 'xplatTestvpngateway',
  type = 'RouteBased',
  publicipPrefix = 'xplatTestIpGateway',
  vnetPrefix = 'xplatTestVnetGateway',
  vnetAddressPrefix = '10.0.0.0/24',
  subnetprefix = 'GatewaySubnet',
  subnetAddressPrefix = '10.0.0.0/28',
  privateIpAddress = '10.0.0.11',
  enablebgp = 'false',
  tags = 'tag1=val1';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westeurope'
}];

describe('arm', function() {
  describe('network', function() {
    var suite,
      timeout,
      retry = 5;
    testUtils.TIMEOUT_INTERVAL = 5000;
    var networkUtil = new networkTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        gatewayPrefix = suite.isMocked ? gatewayPrefix : suite.generateId(gatewayPrefix, null);
        vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    after(function(done) {
      this.timeout(networkUtil.timeout);
      setTimeout(function() {
        //networkUtil.deleteUsedVnet(groupName, vnetPrefix, suite, function() {
        //networkUtil.deleteUsedPublicIp(groupName, publicipPrefix, suite, function() {
        networkUtil.deleteGroup(groupName, suite, function() {
          suite.teardownSuite(done);
        });
        //});
        //});
      }, timeout);
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('vpn-gateway', function() {
      it('create should pass', function(done) {
		this.timeout(this.gatewaytimeout);
        networkUtil.createGroup(groupName, location, suite, function() {
          networkUtil.createVnetWithAddress(groupName, vnetPrefix, location, vnetAddressPrefix, suite, function() {
            networkUtil.createSubnetWithAddress(groupName, vnetPrefix, subnetprefix, subnetAddressPrefix, suite, function() {
              networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function() {
                var cmd = util.format('network vpn-gateway create -g %s -n %s -l %s -y %s -p %s -m %s -e %s -a %s -b %s -t %s --json', groupName, gatewayPrefix, location, type, publicipPrefix, vnetPrefix, subnetprefix, privateIpAddress, enablebgp, tags).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should modify vpn-gateway', function(done) {
		this.timeout(this.gatewaytimeout);
        var cmd = util.format('network vpn-gateway set -g %s -n %s -t %s --json', groupName, gatewayPrefix, tags).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details of vpn-gateway', function(done) {
        var cmd = util.format('network vpn-gateway show -g %s -n %s --json', groupName, gatewayPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(gatewayPrefix);
          done();
        });
      });
      it('list should dispaly all vpn-gateway in a given resource group', function(done) {
        var cmd = util.format('network vpn-gateway list -g %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function(res) {
            return res.name === gatewayPrefix;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete vpn-gate', function(done) {
		this.timeout(this.gatewaytimeout);
        var cmd = util.format('network vpn-gateway delete %s %s --json --quiet', groupName, gatewayPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done(), timeout);
        });
      });
    });
  });
});