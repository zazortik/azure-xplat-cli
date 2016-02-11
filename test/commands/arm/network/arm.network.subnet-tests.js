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
  testprefix = 'arm-network-subnet-tests',
  groupName = 'xplat-test-subnet',
  vnetName = 'test-vnet',
  subnetName = 'test-subnet',
  vnetAddressSpace = '10.0.0.0/8',
  addressPrefix = '10.0.0.0/25',
  newAddressPrefix = '10.0.0.0/24',
  routeTableName = 'test-route-table',
  nsgName = 'test-nsg';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network vnet', function () {
    var suite, retry = 5;
    var networkUtil = new networkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        vnetName = suite.isMocked ? vnetName : suite.generateId(vnetName, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        nsgName = suite.isMocked ? nsgName : suite.generateId(nsgName, null);
        routeTableName = suite.isMocked ? routeTableName : suite.generateId(routeTableName, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteVnet(groupName, vnetName, suite, function () {
        networkUtil.deleteRouteTable(groupName, routeTableName, suite, function () {
          networkUtil.deleteGroup(groupName, suite, function () {
            suite.teardownSuite(done);
          });
        });
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('subnet', function () {
      it('create should create a subnet using nsg id and route table id', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createVnet(groupName, vnetName, location, vnetAddressSpace, suite, function () {
            networkUtil.createNSG(groupName, nsgName, location, suite, function (nsg) {
              networkUtil.createRouteTable(groupName, routeTableName, location, suite, function (routeTable) {
                var cmd = util.format('network vnet subnet create -g %s -e %s -n %s -a %s -w %s -i %s --json',
                  groupName, vnetName, subnetName, addressPrefix, nsg.id, routeTable.id);

                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  var subnet = JSON.parse(result.text);
                  subnet.name.should.equal(subnetName);
                  subnet.networkSecurityGroup.id.should.equal(nsg.id);
                  subnet.routeTable.id.should.equal(routeTable.id);
                  networkUtil.shouldBeSucceeded(subnet);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should unset nsg and route table', function (done) {
        var cmd = util.format('network vnet subnet set -g %s -e %s -n %s -o -r --json', groupName, vnetName, subnetName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnet = JSON.parse(result.text);
          subnet.name.should.equal(subnetName);
          subnet.should.not.have.property('networkSecurityGroup');
          subnet.should.not.have.property('routeTable');
          networkUtil.shouldBeSucceeded(subnet);
          done();
        });
      });
      it('set should set nsg and route table using name', function (done) {
        var cmd = util.format('network vnet subnet set -g %s -e %s -n %s -a %s -o %s -r %s --json',
          groupName, vnetName, subnetName, newAddressPrefix, nsgName, routeTableName);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnet = JSON.parse(result.text);
          subnet.name.should.equal(subnetName);
          subnet.addressPrefix.should.equal(newAddressPrefix);
          subnet.networkSecurityGroup.id.should.containEql(nsgName);
          subnet.routeTable.id.should.containEql(routeTableName);
          done();
        });
      });
      it('list should display all subnets from vnet', function (done) {
        var cmd = util.format('network vnet subnet list -g %s -e %s --json', groupName, vnetName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnets = JSON.parse(result.text);
          _.some(subnets, function (subnet) {
            return subnet.name === subnetName;
          }).should.be.true;
          done();
        });
      });
      it('show should display details about subnet', function (done) {
        var cmd = util.format('network vnet subnet show -g %s -e %s -n %s --json', groupName, vnetName, subnetName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnet = JSON.parse(result.text);
          subnet.name.should.equal(subnetName);
          done();
        });
      });
      it('delete should delete subnet', function (done) {
        var cmd = util.format('network vnet subnet delete -g %s -e %s -n %s --quiet --json', groupName, vnetName, subnetName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('network vnet subnet show -g %s -e %s -n %s --json', groupName, vnetName, subnetName);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var subnet = JSON.parse(result.text);
            subnet.should.be.empty;
            done();
          });
        });
      });
    });
  });
});
