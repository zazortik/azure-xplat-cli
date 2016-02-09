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
var testprefix = 'arm-network-lb-frontend-ip-tests';
var groupPrefix = 'xplatTestGCreateFronIp';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName,
  publicipPrefix = 'xplatTestIp',
  publicipPrefix2 = 'xplatTestsecndIP',
  LBName = 'armEmptyLB',
  FrontendIpName = 'xplattestFrontendIpName',
  FrontendIpName2 = 'xplatFrontendIpsecnd',
  LBNameSV = 'armEmptyLBSV',
  FrontendIpSV = 'xplatTestFrontendIpSV';
var location;
var publicIpId, publicIpName;

var vnetPrefix = 'xplatTestVnetFrontIp';
var vnetAddressSpace = '10.0.0.0/8';
var subnetprefix = 'xplatTestSubnetFrontIp';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;
    var networkUtil = new networkTestUtil();
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null)
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        publicipPrefix2 = suite.isMocked ? publicipPrefix2 : suite.generateId(publicipPrefix2, null);
        LBName = suite.isMocked ? LBName : suite.generateId(LBName, null);
        FrontendIpName = suite.isMocked ? FrontendIpName : suite.generateId(FrontendIpName, null);
        FrontendIpName2 = suite.isMocked ? FrontendIpName2 : suite.generateId(FrontendIpName2, null);
        LBNameSV = suite.isMocked ? LBNameSV : suite.generateId(LBNameSV, null);
        FrontendIpSV = suite.isMocked ? FrontendIpSV : suite.generateId(FrontendIpSV, null);
        vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
        subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix, null);
        done();
      });
    });


    after(function (done) {
      networkUtil.deleteUsedLB(groupName, LBName, suite, function () {
        networkUtil.deleteUsedPublicIp(groupName, publicipPrefix, suite, function () {
          networkUtil.deleteUsedPublicIp(groupName, publicipPrefix2, suite, function () {
            networkUtil.deleteUsedLB(groupName, LBNameSV, suite, function () {
              networkUtil.deleteUsedSubnet(groupName, vnetPrefix, subnetprefix, suite, function () {
                networkUtil.deleteVnet(groupName, vnetPrefix, suite, function () {
                  networkUtil.deleteGroup(groupName, suite, function () {
                    suite.teardownSuite(done);
                  });
                });
              });
            });
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

    describe('lb frontend-ip', function () {

      // frontend-ip create using public-ip id
      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function () {
            networkUtil.showPublicIp(groupName, publicipPrefix, suite, function () {
              networkUtil.createLB(groupName, LBName, location, suite, function () {
                var cmd = util.format('network lb frontend-ip create %s %s %s -u %s --json', groupName, LBName, FrontendIpName, networkTestUtil.publicIpId).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
      //Second frontend-ip for the same lb
      it('create should create second frontend-ip for same lb', function (done) {
        networkUtil.createPublicIp(groupName, publicipPrefix2, location, suite, function () {
          var cmd = util.format('network lb frontend-ip create %s %s %s -i %s --json', groupName, LBName, FrontendIpName2, publicipPrefix2).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      //frontend-ip create using subnet & vnet
      it('create using subnet & vnet should pass', function (done) {
        networkUtil.createVnet(groupName, vnetPrefix, location, vnetAddressSpace, suite, function () {
          networkUtil.createSubnet(groupName, vnetPrefix, subnetprefix, suite, function () {
            networkUtil.createLB(groupName, LBNameSV, location, suite, function () {
              var cmd = util.format('network lb frontend-ip create %s %s %s -e %s -m %s -a 10.0.0.4 --json', groupName, LBNameSV, FrontendIpSV, subnetprefix, vnetPrefix).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                done();
              });
            });
          });
        });
      });
      it('set should modify frontend-ip', function (done) {
        suite.execute('network lb frontend-ip set -g %s -l %s -n %s -u %s  --json', groupName, LBName, FrontendIpName, networkTestUtil.publicIpId, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('list should display all frontend-ips from load balancer ', function (done) {
        var cmd = util.format('network lb frontend-ip list -g %s -l %s --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].name.should.equal(FrontendIpName);
          allResources[1].name.should.equal(FrontendIpName2);
          done();
        });
      });

      // Note: multiple FIPs for LB currenlty not supported. You can't delete last FIP from LB.
      //
      // it('delete should delete frontend-ip', function (done) {
      // suite.execute('network lb frontend-ip delete -g %s -l %s %s -q --json', groupName, LBName, FrontendIpName, function (result) {
      // result.exitStatus.should.equal(0);
      // done();
      // });
      // });

    });

  });
});