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
var testprefix = 'arm-network-nsg-rule-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName, location, nsgName, nsgRule,
  groupPrefix = 'xplatGroupNsgRule',
  nsgPrefix = 'xplatTestNsg',
  nsgRulePrefix = 'xplatTestNsgRule';
var proto = 'tcp',
  saprefix = '10.0.0.0/24',
  spr = '200',
  daprefix = '10.0.0.0/12',
  dprange = '250',
  access = 'Allow',
  priority = '250',
  direction = 'Inbound',
  description = 'NsgRule';
var proto1 = 'udp',
  saprefix1 = '10.0.0.0/8',
  spr1 = '250',
  daprefix1 = '10.0.0.0/16',
  dprange1 = '300',
  access1 = 'Deny',
  priority1 = '300',
  direction1 = 'outbound',
  description1 = 'NsgRuleSetting';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];


describe('arm', function () {
  describe('network', function () {
    var suite,
      retry = 5;
    var networkUtil = new networkTestUtil();
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        nsgName = suite.isMocked ? nsgPrefix : suite.generateId(nsgPrefix, null);
        nsgRule = suite.isMocked ? nsgRulePrefix : suite.generateId(nsgRulePrefix, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteUsedNsg(groupName, nsgName, suite, function () {
        networkUtil.deleteGroup(groupName, suite, function () {
          suite.teardownSuite(done);
        });
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('nsg rule', function () {
      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createNSG(groupName, nsgName, location, suite, function (result) {
            var cmd = util.format('network nsg rule create %s %s %s -p %s -f %s -o %s -e %s -u %s -c %s -y %s -r %s -d %s --json',
              groupName, nsgName, nsgRule, proto, saprefix, spr, daprefix, dprange, access, priority, direction, description).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      it('set should modify nsg rule', function (done) {
        var cmd = util.format('network nsg rule set %s %s %s -p %s -f %s -o %s -e %s -u %s -c %s -y %s -r %s -d %s --json',
          groupName, nsgName, nsgRule, proto1, saprefix1, spr1, daprefix1, dprange1, access1, priority1, direction1, description1).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details about nsg rule ', function (done) {
        var cmd = util.format('network nsg rule show %s %s %s --json', groupName, nsgName, nsgRule).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(nsgRule);
          done();
        });
      });
      it('list should display all rules in the nsg', function (done) {
        var cmd = util.format('network nsg rule list %s %s --json', groupName, nsgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function (res) {
            return res.name === nsgRule;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete rules', function (done) {
        var cmd = util.format('network nsg rule delete %s %s %s --quiet --json', groupName, nsgName, nsgRule).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

  });
});