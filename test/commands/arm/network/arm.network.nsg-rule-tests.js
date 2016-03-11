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

var testPrefix = 'arm-network-nsg-rule-tests',
  groupName = 'xplat-test-nsg-rule',
  nsgName = 'test-nsg',
  location;

var ruleProp = {
  name: 'test-rule',
  nameAllowVnetInBound: 'AllowVnetInBound',
  nameAllowAzureLoadBalancerInBound: 'AllowAzureLoadBalancerInBound',
  description: 'someshorttext',
  newDescription: 'foobarbaz',
  protocol: 'Tcp',
  newProtocol: 'Udp',
  sourcePortRange: '200',
  newSourcePortRange: '*',
  destinationPortRange: '250',
  newDestinationPortRange: '300-400',
  sourceAddressPrefix: '10.0.0.0/24',
  newSourceAddressPrefix: 'VirtualNetwork',
  destinationAddressPrefix: '10.0.0.0/12',
  newDestinationAddressPrefix: '*',
  access: 'Allow',
  newAccess: 'Deny',
  priority: 100,
  newPriority: 300,
  direction: 'Inbound',
  newDirection: 'Outbound'
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;
    var networkUtil = new NetworkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        nsgName = suite.isMocked ? nsgName : suite.generateId(nsgName, null);

        ruleProp.group = groupName;
        ruleProp.location = location;
        ruleProp.nsgName = nsgName;
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

    describe('nsg rule', function () {
      it('create should create nsg rule', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createNSG(groupName, nsgName, location, suite, function () {
            var cmd = 'network nsg rule create -g {group} -a {nsgName} -n {name} -d {description} -p {protocol} -f {sourceAddressPrefix} -o {sourcePortRange} -e {destinationAddressPrefix} -u {destinationPortRange} -c {access} -y {priority} -r {direction} --json'
              .formatArgs(ruleProp);

            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              var rule = JSON.parse(result.text);
              rule.name.should.equal(ruleProp.name);
              rule.description.should.equal(ruleProp.description);
              rule.protocol.should.equal(ruleProp.protocol);
              rule.sourceAddressPrefix.should.equal(ruleProp.sourceAddressPrefix);
              rule.sourcePortRange.should.equal(ruleProp.sourcePortRange);
              rule.destinationAddressPrefix.should.equal(ruleProp.destinationAddressPrefix);
              rule.destinationPortRange.should.equal(ruleProp.destinationPortRange);
              rule.access.should.equal(ruleProp.access);
              rule.priority.should.equal(ruleProp.priority);
              rule.direction.should.equal(ruleProp.direction);
              networkUtil.shouldBeSucceeded(rule);
              done();
            });
          });
        });
      });
      it('set should modify nsg rule', function (done) {
        var cmd = 'network nsg rule set -g {group} -a {nsgName} -n {name} -d {newDescription} -p {newProtocol} -f {newSourceAddressPrefix} -o {newSourcePortRange} -e {newDestinationAddressPrefix} -u {newDestinationPortRange} -c {newAccess} -y {newPriority} -r {newDirection} --json'
          .formatArgs(ruleProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var rule = JSON.parse(result.text);
          rule.name.should.equal(ruleProp.name);
          rule.description.should.equal(ruleProp.newDescription);
          rule.protocol.should.equal(ruleProp.newProtocol);
          rule.sourceAddressPrefix.should.equal(ruleProp.newSourceAddressPrefix);
          rule.sourcePortRange.should.equal(ruleProp.newSourcePortRange);
          rule.destinationAddressPrefix.should.equal(ruleProp.newDestinationAddressPrefix);
          rule.destinationPortRange.should.equal(ruleProp.newDestinationPortRange);
          rule.access.should.equal(ruleProp.newAccess);
          rule.priority.should.equal(ruleProp.newPriority);
          rule.direction.should.equal(ruleProp.newDirection);
          networkUtil.shouldBeSucceeded(rule);
          done();
        });
      });
      it('show should display details about nsg rule ', function (done) {
        var cmd = 'network nsg rule show -g {group} -a {nsgName} -n {name} --json'.formatArgs(ruleProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var rule = JSON.parse(result.text);
          rule.name.should.equal(ruleProp.name);
          done();
        });
      });
      it('list should display default rules in nsg', function (done) {
        var cmd = 'network nsg rule list -g {group} -a {nsgName} --json'.formatArgs(ruleProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var rules = JSON.parse(result.text);
          rules.some(function (rule) {
            return rule.name === ruleProp.nameAllowVnetInBound;
          }).should.be.true;
          rules.some(function (rule) {
            return rule.name === ruleProp.nameAllowAzureLoadBalancerInBound;
          }).should.be.true;
          done();
        });
      });
      it('list should display all rules in nsg', function (done) {
        var cmd = 'network nsg rule list -g {group} -a {nsgName} --json'.formatArgs(ruleProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var rules = JSON.parse(result.text);
          rules.some(function (rule) {
            return rule.name === ruleProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete nsg rule', function (done) {
        var cmd = 'network nsg rule delete -g {group} -a {nsgName} -n {name} --quiet --json'.formatArgs(ruleProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network nsg rule show -g {group} -a {nsgName} -n {name} --json'.formatArgs(ruleProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var rule = JSON.parse(result.text);
            rule.should.be.empty;
            done();
          });
        });
      });
    });
  });
});