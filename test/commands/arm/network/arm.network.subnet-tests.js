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

var testPrefix = 'arm-network-subnet-tests',
  groupName = 'xplat-test-subnet',
  location;

var subnetProp = {
  name: 'test-subnet',
  vnetName: 'test-vnet',
  vnetAddressSpace: '10.0.0.0/8',
  addressPrefix: '10.0.0.0/25',
  newAddressPrefix: '10.0.0.0/24',
  routeTableName: 'test-route-table',
  nsgName: 'test-nsg'
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network vnet', function () {
    var suite, retry = 5;
    var networkUtil = new NetworkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        subnetProp.location = location;
        subnetProp.group = groupName;
        subnetProp.name = suite.isMocked ? subnetProp.name : suite.generateId(subnetProp.name, null);
        subnetProp.vnetName = suite.isMocked ? subnetProp.vnetName : suite.generateId(subnetProp.vnetName, null);
        subnetProp.nsgName = suite.isMocked ? subnetProp.nsgName : suite.generateId(subnetProp.nsgName, null);
        subnetProp.routeTableName = suite.isMocked ? subnetProp.routeTableName : suite.generateId(subnetProp.routeTableName, null);

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

    describe('subnet', function () {
      it('create should create a subnet using nsg id and route table id', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createVnet(groupName, subnetProp.vnetName, location, subnetProp.vnetAddressSpace, suite, function () {
            networkUtil.createNSG(groupName, subnetProp.nsgName, location, suite, function (nsg) {
              networkUtil.createRouteTable(groupName, subnetProp.routeTableName, location, suite, function (routeTable) {
                var cmd = 'network vnet subnet create -g {group} -e {vnetName} -n {name} -a {addressPrefix} -w {1} -i {2} --json'
                  .formatArgs(subnetProp, nsg.id, routeTable.id);

                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  var subnet = JSON.parse(result.text);
                  subnet.name.should.equal(subnetProp.name);
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
        var cmd = 'network vnet subnet set -g {group} -e {vnetName} -n {name} -o -r --json'.formatArgs(subnetProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnet = JSON.parse(result.text);
          subnet.name.should.equal(subnetProp.name);
          subnet.should.not.have.property('networkSecurityGroup');
          subnet.should.not.have.property('routeTable');
          networkUtil.shouldBeSucceeded(subnet);
          done();
        });
      });
      it('set should set nsg and route table using name', function (done) {
        var cmd = util.format('network vnet subnet set -g {group} -e {vnetName} -n {name} -a {newAddressPrefix} -o {nsgName} ' +
          '-r {routeTableName} --json').formatArgs(subnetProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnet = JSON.parse(result.text);
          subnet.name.should.equal(subnetProp.name);
          subnet.addressPrefix.should.equal(subnetProp.newAddressPrefix);
          subnet.networkSecurityGroup.id.should.containEql(subnetProp.nsgName);
          subnet.routeTable.id.should.containEql(subnetProp.routeTableName);
          done();
        });
      });
      it('list should display all subnets from vnet', function (done) {
        var cmd = 'network vnet subnet list -g {group} -e {vnetName} --json'.formatArgs(subnetProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnets = JSON.parse(result.text);
          _.some(subnets, function (subnet) {
            return subnet.name === subnetProp.name;
          }).should.be.true;
          done();
        });
      });
      it('show should display details about subnet', function (done) {
        var cmd = 'network vnet subnet show -g {group} -e {vnetName} -n {name} --json'.formatArgs(subnetProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var subnet = JSON.parse(result.text);
          subnet.name.should.equal(subnetProp.name);
          done();
        });
      });
      it('delete should delete subnet', function (done) {
        var cmd = 'network vnet subnet delete -g {group} -e {vnetName} -n {name} --quiet --json'.formatArgs(subnetProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network vnet subnet show -g {group} -e {vnetName} -n {name} --json'.formatArgs(subnetProp);
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
