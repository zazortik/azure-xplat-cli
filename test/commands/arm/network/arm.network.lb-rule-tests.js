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
var testprefix = 'arm-network-lb-rule-tests';
var groupPrefix = 'xplatTestGCreateLBRule';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName, protocol = 'tcp',
  fport = '80',
  bport = '80',
  enafip = 'true',
  idle = '4',
  publicipPrefix = 'xplatTestIpRule',
  LBName = 'armEmptyLB',
  LBAddPool = 'LB-AddPool',
  LBRuleName = 'LB-Rule',
  FrontendIpName = 'xplattestFrontendIpName',
  LBProbe = 'LB-Probe',
  location;
var publicIpId;
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

describe('arm', function() {
  describe('network', function() {
    var suite,
      retry = 5;
    var networkUtil = new networkTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        LBName = suite.generateId(LBName, null);
        LBAddPool = suite.generateId(LBAddPool, null);
        LBRuleName = suite.generateId(LBRuleName, null);
        LBProbe = suite.generateId(LBProbe, null);
        FrontendIpName = suite.isMocked ? FrontendIpName : suite.generateId(FrontendIpName, null);
        done();
      });
    });
    after(function(done) {
      networkUtil.deleteLBAddPool(groupName, LBName, LBAddPool, suite, function() {
        networkUtil.deleteLBProbe(groupName, LBName, LBProbe, suite, function() {
          networkUtil.deleteUsedLB(groupName, LBName, suite, function() {
            networkUtil.deleteUsedPublicIp(groupName, publicipPrefix, suite, function() {
              networkUtil.deleteUsedGroup(groupName, suite, function() {
                suite.teardownSuite(done);
              });
            });
          });
        });
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('lb rule', function() {

      it('create should pass', function(done) {
        networkUtil.createGroup(groupName, location, suite, function() {
          networkUtil.createLB(groupName, LBName, location, suite, function() {
            networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function() {
              networkUtil.showPublicIp(groupName, publicipPrefix, suite, function() {
                networkUtil.createFrontendIp(groupName, LBName, FrontendIpName, networkTestUtil.publicIpId, suite, function() {
                  networkUtil.createLbAddressPool(groupName, LBName, LBAddPool, suite, function() {
                    networkUtil.createLBProbe(groupName, LBName, LBProbe, suite, function() {
                      var cmd = util.format('network lb rule create -g %s -l %s -n %s -p %s -f %s -b %s -e %s -i %s -o %s -a %s -t %s --json',
                        groupName, LBName, LBRuleName, protocol, fport, bport, enafip, idle, LBAddPool, LBProbe, FrontendIpName).split(' ');
                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
      it('set should modify lb rule ', function(done) {
        var cmd = util.format('network lb rule set -g %s -l %s -n %s -p %s -f %s -b %s -i %s -o %s -a %s -t %s --json',
          groupName, LBName, LBRuleName, protocol, '82', '82', '5', LBAddPool, LBProbe, FrontendIpName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('list should display all rules from load balancer', function(done) {
        var cmd = util.format('network lb rule list -g %s -l %s --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].name.should.equal(LBRuleName);
          done();
        });
      });
      it('delete should delete rule', function(done) {
        var cmd = util.format('network lb rule delete %s %s %s --quiet --json', groupName, LBName, LBRuleName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});