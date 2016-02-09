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
  testPrefix = 'arm-network-vnet-tests',
  groupName = 'xplat-test-vnet',
  vnetName = 'test-vnet',
  dnsServer = '192.168.1.1',
  anotherDnsServer = '192.168.1.2',
  addressPrefix = '10.0.0.0/24',
  anotherAddressPrefix = '10.0.1.0/24';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
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
        vnetName = suite.isMocked ? vnetName : suite.generateId(vnetName, null);
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

    describe('vnet', function () {
      it('create should create vnet', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = util.format('network vnet create -g %s -n %s -l %s -a %s -d %s -t %s --json',
            groupName, vnetName, location, addressPrefix, dnsServer, networkUtil.tags);

          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var vnet = JSON.parse(result.text);
            vnet.name.should.equal(vnetName);
            done();
          });
        });
      });
      it('set should modify vnet', function (done) {
        var cmd = util.format('network vnet set -g %s -n %s -d %s -a %s -t %s --json',
          groupName, vnetName, anotherDnsServer, anotherAddressPrefix, networkUtil.newTags);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var vnet = JSON.parse(result.text);
          vnet.name.should.equal(vnetName);
          vnet.addressSpace.addressPrefixes.length.should.equal(2);
          vnet.addressSpace.addressPrefixes.should.containEql(addressPrefix);
          vnet.addressSpace.addressPrefixes.should.containEql(anotherAddressPrefix);
          vnet.dhcpOptions.dnsServers.length.should.equal(2);
          vnet.dhcpOptions.dnsServers.should.containEql(dnsServer);
          vnet.dhcpOptions.dnsServers.should.containEql(anotherDnsServer);
          networkUtil.shouldAppendTags(vnet);
          done();
        });
      });
      it('show should display details of vnet', function (done) {
        var cmd = util.format('network vnet show -g %s -n %s --json', groupName, vnetName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          var vnet = JSON.parse(result.text);
          vnet.name.should.equal(vnetName);
          done();
        });
      });
      it('list should display all vnets from resource group', function (done) {
        var cmd = util.format('network vnet list -g %s --json', groupName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var vnets = JSON.parse(result.text);
          _.some(vnets, function (vnet) {
            return vnet.name === vnetName;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete vnet', function (done) {
        var cmd = util.format('network vnet delete -g %s -n %s --quiet --json', groupName, vnetName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('network vnet show -g %s -n %s --json', groupName, vnetName);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var vnet = JSON.parse(result.text);
            vnet.should.be.empty;
            done();
          });
        });
      });

    });
  });
});