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

var testPrefix = 'arm-network-lb-frontend-ip-tests',
  groupName = 'xplat-test-lb-fip',
  location;

var fipProp = {
  name: 'test-fip',
  privateIp: '10.0.0.4',
  newPrivateIp: '10.0.0.6'
};

var lbName = 'test-lb',
  vnetName = 'test-vnet',
  publicIpName = 'test-ip',
  vnetAddressSpace = '10.0.0.0/8',
  subnetName = 'test-subnet',
  subnetAddressPrefix = '10.0.0.0/24';

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
        lbName = suite.isMocked ? lbName : suite.generateId(lbName, null);

        fipProp.group = groupName;
        fipProp.lbName = lbName;
        fipProp.name = suite.isMocked ? fipProp.name : suite.generateId(fipProp.name, null);

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

    describe('lb frontend-ip', function () {
      it('create should create fip using public ip id', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, lbName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicIpName, location, suite, function (publicIp) {
              var cmd = 'network lb frontend-ip create -g {group} -l {lbName} -n {name} -u {1} --json'
                .formatArgs(fipProp, publicIp.id);

              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                var fip = JSON.parse(result.text);
                fip.name.should.equal(fipProp.name);
                fip.publicIPAddress.id.should.equal(publicIp.id);
                networkUtil.shouldBeSucceeded(fip);
                networkUtil.deleteLB(groupName, lbName, suite, done);
              });
            });
          });
        });
      });
      it('create should create fip using public ip name', function (done) {
        networkUtil.createLB(groupName, lbName, location, suite, function () {
          var cmd = 'network lb frontend-ip create -g {group} -l {lbName} -n {name} -i {1} --json'
            .formatArgs(fipProp, publicIpName);

          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var fip = JSON.parse(result.text);
            fip.name.should.equal(fipProp.name);
            fip.publicIPAddress.id.should.containEql(publicIpName);
            networkUtil.shouldBeSucceeded(fip);
            networkUtil.deleteLB(groupName, lbName, suite, done);
          });
        });
      });
      it('create should create fip using subnet id', function (done) {
        networkUtil.createLB(groupName, lbName, location, suite, function () {
          networkUtil.createVnet(groupName, vnetName, location, vnetAddressSpace, suite, function (vnet) {
            networkUtil.createSubnet(groupName, vnetName, subnetName, subnetAddressPrefix, suite, function (subnet) {
              var cmd = 'network lb frontend-ip create -g {group} -l {lbName} -n {name} -a {privateIp} -b {1} --json'
                .formatArgs(fipProp, subnet.id);

              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                var fip = JSON.parse(result.text);
                fip.name.should.equal(fipProp.name);
                fip.subnet.id.should.equal(subnet.id);
                networkUtil.shouldBeSucceeded(fip);
                networkUtil.deleteLB(groupName, lbName, suite, done);
              });
            });
          });
        });
      });
      it('create should create fip using subnet name and vnet name', function (done) {
        networkUtil.createLB(groupName, lbName, location, suite, function () {
          var cmd = 'network lb frontend-ip create -g {group} -l {lbName} -n {name} -a {privateIp} -e {1} -m {2} --json'
            .formatArgs(fipProp, subnetName, vnetName);

          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var fip = JSON.parse(result.text);
            fip.name.should.equal(fipProp.name);
            fip.subnet.id.should.containEql(subnetName);
            networkUtil.shouldBeSucceeded(fip);
            done();
          });
        });
      });
      it('set should modify fip', function (done) {
        var cmd = 'network lb frontend-ip set -g {group} -l {lbName} -n {name} -a {newPrivateIp} --json'.formatArgs(fipProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var fip = JSON.parse(result.text);
          fip.name.should.equal(fipProp.name);
          fip.privateIPAddress.should.equal(fipProp.newPrivateIp);
          networkUtil.shouldBeSucceeded(fip);
          done();
        });
      });
      it('list should display all fips from load balancer', function (done) {
        var cmd = 'network lb frontend-ip list -g {group} -l {lbName} --json'.formatArgs(fipProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var fips = JSON.parse(result.text);
          _.some(fips, function (fip) {
            return fip.name === fipProp.name;
          }).should.be.true;
          done();
        });
      });

      // Note: multiple FIPs for LB currently not supported. You can't delete last FIP from LB.
    });
  });
});