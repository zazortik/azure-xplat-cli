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

var testPrefix = 'arm-network-lb-inbound-nat-rule-tests',
  groupName = 'xplat-test-lb-inbound-nat-rules',
  location;

var ruleProp = {
  name: 'test-inbound-rule',
  protocol: 'Tcp',
  newProtocol: 'Udp',
  frontendPort: 80,
  newFrontendPort: 90,
  backendPort: 80,
  newBackendPort: 90,
  idleTimeoutInMinutes: 15,
  newIdleTimeoutInMinutes: 20,
  enableFloatingIP: true,
  newEnableFloatingIP: false
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
    var suite, retry = 5;
    var networkUtil = new networkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        lbName = suite.isMocked ? lbName : suite.generateId(lbName, null);
        publicIpName = suite.isMocked ? publicIpName : suite.generateId(publicIpName, null);
        fipName = suite.isMocked ? fipName : suite.generateId(fipName, null);

        ruleProp.group = groupName;
        ruleProp.lbName = lbName;
        ruleProp.name = suite.isMocked ? ruleProp.name : suite.generateId(ruleProp.name, null);

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

    describe('lb-inbound-nat-rule', function () {
      it('create should create inbound nat rule in in load balancer', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, lbName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicIpName, location, suite, function (publicIp) {
              networkUtil.createFIP(groupName, lbName, fipName, publicIp.id, suite, function (fip) {
                var cmd = 'network lb inbound-nat-rule create -g {group} -l {lbName} -n {name} -p {protocol} -f {frontendPort} -b {backendPort} -e {enableFloatingIP} -i {idleTimeoutInMinutes} -t {1} --json'
                  .formatArgs(ruleProp, fip.name);

                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  var rule = JSON.parse(result.text);
                  rule.name.should.equal(ruleProp.name);
                  rule.protocol.should.equal(ruleProp.protocol);
                  rule.frontendPort.should.equal(ruleProp.frontendPort);
                  rule.backendPort.should.equal(ruleProp.backendPort);
                  rule.enableFloatingIP.should.equal(ruleProp.enableFloatingIP);
                  rule.idleTimeoutInMinutes.should.equal(ruleProp.idleTimeoutInMinutes);
                  rule.frontendIPConfiguration.id.should.equal(fip.id);
                  networkUtil.shouldBeSucceeded(rule);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should modify inbound-nat-rule in load balancer', function (done) {
        var cmd = 'network lb inbound-nat-rule set -g {group} -l {lbName} -n {name} -p {newProtocol} -f {newFrontendPort} -b {newBackendPort} -e {newEnableFloatingIP} -i {newIdleTimeoutInMinutes} --json'
          .formatArgs(ruleProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var rule = JSON.parse(result.text);
          rule.name.should.equal(ruleProp.name);
          rule.protocol.should.equal(ruleProp.newProtocol);
          rule.frontendPort.should.equal(ruleProp.newFrontendPort);
          rule.backendPort.should.equal(ruleProp.newBackendPort);
          rule.enableFloatingIP.should.equal(ruleProp.newEnableFloatingIP);
          rule.idleTimeoutInMinutes.should.equal(ruleProp.newIdleTimeoutInMinutes);
          networkUtil.shouldBeSucceeded(rule);
          done();
        });
      });
      it('list should display all inbound nat rules in load balancer', function (done) {
        var cmd = 'network lb inbound-nat-rule list -g {group} -l {lbName} --json'.formatArgs(ruleProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var rules = JSON.parse(result.text);
          _.some(rules, function (rule) {
            return rule.name === ruleProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete inbound-nat-rule in load balancer', function (done) {
        var cmd = 'network lb inbound-nat-rule delete -g {group} -l {lbName} -n {name} --quiet --json'.formatArgs(ruleProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network lb inbound-nat-rule list -g {group} -l {lbName} --json'.formatArgs(ruleProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var rules = JSON.parse(result.text);
            _.some(rules, function (rule) {
              return rule.name === ruleProp.name;
            }).should.be.false;
            done();
          });
        });
      });
    });
  });
});