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

var testPrefix = 'arm-network-lb-inbound-nat-pool-tests',
  groupName = 'xplat-test-lb-inbound-nat-pools',
  location;

var poolProp = {
  name: 'test-inbound-pool',
  protocol: 'Tcp',
  newProtocol: 'Udp',
  frontendPortRangeStart: 50000,
  newFrontendPortRangeStart: 50001,
  frontendPortRangeEnd: 55000,
  newFrontendPortRangeEnd: 55001,
  backendPort: 80,
  newBackendPort: 81
};

var lbName = 'test-lb',
  publicIpName = 'test-ip',
  fipName = 'test-fip';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

describe('arm', function () {
  describe('network', function () {
    var suite,
      retry = 5;
    var networkUtil = new NetworkTestUtil();
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        lbName = suite.isMocked ? lbName : suite.generateId(lbName, null);
        publicIpName = suite.isMocked ? publicIpName : suite.generateId(publicIpName, null);
        fipName = suite.isMocked ? fipName : suite.generateId(fipName, null);

        poolProp.group = groupName;
        poolProp.lbName = lbName;
        poolProp.name = suite.isMocked ? poolProp.name : suite.generateId(poolProp.name, null);
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

    describe('lb-inbound-nat-pool', function () {
      it('create should create inbound nat pool in load balancer', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, lbName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicIpName, location, suite, function (publicIp) {
              networkUtil.createFIP(groupName, lbName, fipName, publicIp.id, suite, function (fip) {
                var cmd = util.format('network lb inbound-nat-pool create -g {group} -l {lbName} -n {name} -p {protocol} ' +
                  '-f {frontendPortRangeStart} -e {frontendPortRangeEnd} -b {backendPort} -i {1} --json').formatArgs(poolProp, fip.name);

                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  var pool = JSON.parse(result.text);
                  pool.name.should.equal(poolProp.name);
                  pool.protocol.should.equal(poolProp.protocol);
                  pool.frontendPortRangeStart.should.equal(poolProp.frontendPortRangeStart);
                  pool.frontendPortRangeEnd.should.equal(poolProp.frontendPortRangeEnd);
                  pool.backendPort.should.equal(poolProp.backendPort);
                  pool.frontendIPConfiguration.id.should.equal(fip.id);
                  networkUtil.shouldBeSucceeded(pool);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should modify inbound nat pool in load balancer', function (done) {
        var cmd = util.format('network lb inbound-nat-pool set -g {group} -l {lbName} -n {name} -p {newProtocol} ' +
          '-f {newFrontendPortRangeStart} -e {newFrontendPortRangeEnd} -b {newBackendPort} --json').formatArgs(poolProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var pool = JSON.parse(result.text);
          pool.name.should.equal(poolProp.name);
          pool.protocol.should.equal(poolProp.newProtocol);
          pool.frontendPortRangeStart.should.equal(poolProp.newFrontendPortRangeStart);
          pool.frontendPortRangeEnd.should.equal(poolProp.newFrontendPortRangeEnd);
          pool.backendPort.should.equal(poolProp.newBackendPort);
          networkUtil.shouldBeSucceeded(pool);
          done();
        });
      });
      it('list should display all inbound-nat-pool in load balancer', function (done) {
        var cmd = 'network lb inbound-nat-pool list -g {group} -l {lbName} --json'.formatArgs(poolProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var pools = JSON.parse(result.text);
          _.some(pools, function (pool) {
            return pool.name === poolProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete inbound-nat-pool in load balancer', function (done) {
        var cmd = 'network lb inbound-nat-pool delete -g {group} -l {lbName} -n {name} --quiet --json'.formatArgs(poolProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network lb inbound-nat-pool list -g {group} -l {lbName} --json'.formatArgs(poolProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var pools = JSON.parse(result.text);
            _.some(pools, function (pool) {
              return pool.name === poolProp.name;
            }).should.be.false;
            done();
          });
        });
      });
    });
  });
});