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

var testPrefix = 'arm-network-nic-tests',
  groupName = 'xplat-test-nic',
  location;

var nicProp = {
  group: groupName,
  name: 'test-nic',
  privateIP: '10.0.0.22',
  newPrivateIP: '10.0.0.25',
  internalDns: 'internal-dns-foo',
  newInternalDns: 'internal-dns-bar',
  disForward: false,
  enabForward: true,
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};

var vnetName = 'test-vnet',
  vnetAddressSpace = '10.0.0.0/8',
  subnetName = 'test-subnet',
  subnetAddressPrefix = '10.0.0.0/24',
  publicIpName = 'test-ip',
  nsgName = 'test-nsg',
  lbName = 'test-lb',
  fipName = 'test-fip',
  fipIPName = 'test-ip-fip',
  poolName = 'test-pool',
  inboundRuleName = 'test-inbound-rule',
  protocol = 'tcp',
  frontendPort = '90',
  backendPort = '90',
  enableIp = true,
  idleTimeout = 4;

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        nicProp.location = location;
        nicProp.group = groupName;
        nicProp.name = suite.isMocked ? nicProp.name : suite.generateId(nicProp.name, null);

        vnetName = suite.isMocked ? vnetName : suite.generateId(vnetName, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);

        publicIpName = suite.isMocked ? publicIpName : suite.generateId(publicIpName, null);
        nsgName = suite.isMocked ? nsgName : suite.generateId(nsgName, null);

        lbName = suite.isMocked ? lbName : suite.generateId(lbName, null);
        fipName = suite.isMocked ? fipName : suite.generateId(fipName, null);
        poolName = suite.isMocked ? poolName : suite.generateId(poolName, null);
        inboundRuleName = suite.isMocked ? inboundRuleName : suite.generateId(inboundRuleName, null);

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

    describe('nic', function () {
      it('create should create nic using subnet', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createVnet(groupName, vnetName, location, vnetAddressSpace, suite, function () {
            networkUtil.createSubnet(groupName, vnetName, subnetName, subnetAddressPrefix, suite, function (subnet) {
              var cmd = util.format('network nic create -g {group} -n {name} -l {location} -a {privateIP} -r {internalDns} ' +
                '-f {disForward} -t {tags} -u {1} --json').formatArgs(nicProp, subnet.id);

              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                var nic = JSON.parse(result.text);
                nic.name.should.equal(nicProp.name);
                nic.ipConfigurations.length.should.equal(1);
                nic.ipConfigurations[0].subnet.id.should.equal(subnet.id);
                networkUtil.shouldHaveTags(nic);
                networkUtil.shouldBeSucceeded(nic);
                done();
              });
            });
          });
        });
      });
      it('set should modify nic with nsg and public ip by ids', function (done) {
        networkUtil.createPublicIp(groupName, publicIpName, location, suite, function (publicIp) {
          networkUtil.createNSG(groupName, nsgName, location, suite, function (nsg) {
            var cmd = util.format('network nic set -g {group} -n {name} -a {newPrivateIP} -r {newInternalDns} -f {enabForward} ' +
              '-t {newTags} -i {1} -w {2} --json').formatArgs(nicProp, publicIp.id, nsg.id);

            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              var nic = JSON.parse(result.text);
              nic.name.should.equal(nicProp.name);
              nic.ipConfigurations.length.should.equal(1);
              nic.ipConfigurations[0].publicIPAddress.id.should.equal(publicIp.id);
              nic.ipConfigurations[0].privateIPAddress.should.equal(nicProp.newPrivateIP);
              nic.networkSecurityGroup.id.should.equal(nsg.id);
              nic.enableIPForwarding.should.equal(nicProp.enabForward);
              nic.dnsSettings.internalDnsNameLabel.should.equal(nicProp.newInternalDns);
              networkUtil.shouldAppendTags(nic);
              networkUtil.shouldBeSucceeded(nic);
              done();
            });
          });
        });
      });
      it('set should unset nsg and public ip from nic', function (done) {
        var cmd = 'network nic set -g {group} -n {name} -p -o --json'.formatArgs(nicProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.should.not.have.property('networkSecurityGroup');
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].should.not.have.property('publicIPAddress');
          networkUtil.shouldBeSucceeded(nic);
          done();
        });
      });
      it('show should display nic details', function (done) {
        var cmd = 'network nic show -g {group} -n {name} --json'.formatArgs(nicProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          done();
        });
      });
      it('list should display all nics in resource group', function (done) {
        var cmd = 'network nic list -g {group} --json'.formatArgs(nicProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nics = JSON.parse(result.text);
          _.some(nics, function (nic) {
            return nic.name === nicProp.name;
          }).should.be.true;
          done();
        });
      });
      it('set should attach address pool by id', function (done) {
        networkUtil.createLB(groupName, lbName, location, suite, function () {
          networkUtil.createPublicIp(groupName, fipIPName, location, suite, function (publicIp) {
            networkUtil.createFIP(groupName, lbName, fipName, publicIp.id, suite, function (fip) {
              networkUtil.createAddressPool(groupName, lbName, poolName, suite, function (pool) {
                var cmd = 'network nic set -g {group} -n {name} -d {1} --json'.formatArgs(nicProp, pool.id);
                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  var nic = JSON.parse(result.text);
                  nic.name.should.equal(nicProp.name);
                  nic.ipConfigurations.length.should.equal(1);
                  nic.ipConfigurations[0].loadBalancerBackendAddressPools.length.should.equal(1);
                  nic.ipConfigurations[0].loadBalancerBackendAddressPools[0].id.should.equal(pool.id);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should detach address pool', function (done) {
        var cmd = 'network nic set -g {group} -n {name} -d --json'.formatArgs(nicProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].should.not.have.property('loadBalancerBackendAddressPools');
          done();
        });
      });
      it('address-pool create should attach address pool by name', function (done) {
        var cmd = 'network nic address-pool create -g {group} -n {name} -l {1} -a {2} --json'.formatArgs(nicProp, lbName, poolName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].loadBalancerBackendAddressPools.length.should.equal(1);
          nic.ipConfigurations[0].loadBalancerBackendAddressPools[0].id.should.containEql(poolName);
          done();
        });
      });
      it('address-pool delete should detach address-pool by name', function (done) {
        var cmd = 'network nic address-pool delete -g {group} -n {name} -l {1} -a {2} --json'.formatArgs(nicProp, lbName, poolName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].should.not.have.property('loadBalancerBackendAddressPools');
          done();
        });
      });
      it('set should attach inbound nat rule by id', function (done) {
        networkUtil.createInboundNatRule(groupName, lbName, inboundRuleName, protocol, frontendPort, backendPort, enableIp, 
          idleTimeout, fipName, suite, function (natRule) {
          var cmd = 'network nic set -g {group} -n {name} -e {1} --json'.formatArgs(nicProp, natRule.id);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var nic = JSON.parse(result.text);
            nic.name.should.equal(nicProp.name);
            nic.ipConfigurations.length.should.equal(1);
            nic.ipConfigurations[0].loadBalancerInboundNatRules.length.should.equal(1);
            nic.ipConfigurations[0].loadBalancerInboundNatRules[0].id.should.equal(natRule.id);
            done();
          });
        });
      });
      it('set should detach inbound nat rule', function (done) {
        var cmd = 'network nic set -g {group} -n {name} -e --json'.formatArgs(nicProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].should.not.have.property('loadBalancerInboundNatRules');
          done();
        });
      });
      it('inbound-nat-rule create should attach inbound nat rule by name', function (done) {
        var cmd = 'network nic inbound-nat-rule create -g {group} -n {name} -l {1} -r {2} --json'.formatArgs(nicProp, lbName, inboundRuleName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].loadBalancerInboundNatRules.length.should.equal(1);
          nic.ipConfigurations[0].loadBalancerInboundNatRules[0].id.should.containEql(inboundRuleName);
          done();
        });
      });
      it('inbound-nat-rule delete should detach inbound nat rule by name', function (done) {
        var cmd = 'network nic inbound-nat-rule delete -g {group} -n {name} -l {1} -r {2} --json'.formatArgs(nicProp, lbName, inboundRuleName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var nic = JSON.parse(result.text);
          nic.name.should.equal(nicProp.name);
          nic.ipConfigurations.length.should.equal(1);
          nic.ipConfigurations[0].should.not.have.property('loadBalancerInboundNatRules');
          done();
        });
      });
      it('delete should delete nic', function (done) {
        var cmd = 'network nic delete -g {group} -n {name} --quiet --json'.formatArgs(nicProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network nic show -g {group} -n {name} --json'.formatArgs(nicProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var nic = JSON.parse(result.text);
            nic.should.be.empty;
            done();
          });
        });
      });
    });
  });
});