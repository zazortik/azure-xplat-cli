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
var CLITest = require('../../../framework/arm-cli-test');
var testUtils = require('../../../util/util');
var testprefix = 'arm-network-lb-address-pool-tests';
var groupPrefix = 'xplatTestGCreateLBAPool';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName,
  publicipPrefix = 'xplatTestIpAP',
  LBName = 'armEmptyLB',
  LBAddPool = 'LB-AddPoll',
  FrontendIpName = 'xplatFrontendIpAP',
  NicName = 'xplatNicAP',
  vnetPrefix = 'xplatTestVnetAP',
  subnetprefix = 'xplatTestSubnetAP',
  location;
var publicIpId, subnetId;

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
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
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null)
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        LBName = suite.isMocked ? LBName : suite.generateId(LBName, null);
        LBAddPool = suite.isMocked ? LBAddPool : suite.generateId(LBAddPool, null);
        FrontendIpName = suite.isMocked ? FrontendIpName : suite.generateId(FrontendIpName, null);
        NicName = suite.isMocked ? NicName : suite.generateId(NicName, null);
        vnetPrefix = (suite.isMocked) ? vnetPrefix : suite.generateId(vnetPrefix, null);
        subnetprefix = (suite.isMocked) ? subnetprefix : suite.generateId(subnetprefix, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteLB(groupName, LBName, suite, function () {
        networkUtil.deletePublicIp(groupName, publicipPrefix, suite, function () {
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

    describe('lb address-pool', function () {

      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, LBName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function () {
              networkUtil.showPublicIp(groupName, publicipPrefix, suite, function () {
                networkUtil.createFIP(groupName, LBName, FrontendIpName, networkTestUtil.publicIpId, suite, function () {
                  var cmd = util.format('network lb address-pool create -g %s -l %s %s --json', groupName, LBName, LBAddPool).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function (result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            });
          });
        });
      });
      it('list should display all address-pool in load balancer', function (done) {
        var cmd = util.format('network lb address-pool list -g %s -l %s --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].name.should.equal(LBAddPool);
          done();
        });
      });
      it('delete should delete address-pool', function (done) {
        var cmd = util.format('network lb address-pool delete -g %s -l %s %s -q --json', groupName, LBName, LBAddPool).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});