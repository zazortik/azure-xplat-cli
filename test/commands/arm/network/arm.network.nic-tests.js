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
var testprefix = 'arm-network-nic-tests';
var privateIP = '10.0.0.22',
  privateIP2 = '10.0.0.25';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName, nsgName,
  groupPrefix = 'xplatTestGrpCreateNic',
  vnetPrefix = 'xplatTestVnetNIc',
  subnetprefix = 'xplatTestSubnetNIc',
  nicPrefix = 'xplatTestNic',
  publicipPrefix = 'xplatTestIpNic',
  nsgPrefix = 'xplatTestNSGNic',
  tagVal = 'priority=low',
  tagValN = 'priority=high',
  location;
var internalDnsLabel = 'internlDns',
  enableIpForwarding = 'true',
  internalDnsLabelN = 'internlDnsN',
  enableIpForwardingN = 'false';
var LBName = 'xplattestlbnic',
  FrontendIpName = 'xplattestFrontendIpnic',
  LBAddPool = 'LBAddPollnic',
  lbinboundprefix = 'xplattestInboundnic';
var LBAddPool2 = 'LBNicAddPollnic',
  lbinboundprefix2 = 'LBNicAddInboundnic',
  protocol2 = 'tcp',
  frontendport2 = '3383',
  backendport2 = '3383',
  enablefloatingip2 = 'true';

var protocol = 'tcp',
  frontendport = '3380',
  backendport = '3380',
  enablefloatingip = 'true';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function() {
  describe('network', function() {
    var suite, retry = 5;
    var networkUtil = new networkTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
        subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix, null);
        nicPrefix = suite.isMocked ? nicPrefix : suite.generateId(nicPrefix, null);
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        nsgName = suite.isMocked ? nsgPrefix : suite.generateId(nsgPrefix, null);

        LBName = suite.isMocked ? LBName : suite.generateId(LBName, null);
        FrontendIpName = suite.isMocked ? FrontendIpName : suite.generateId(FrontendIpName, null);
        LBAddPool = suite.isMocked ? LBAddPool : suite.generateId(LBAddPool, null);
        lbinboundprefix = suite.isMocked ? lbinboundprefix : suite.generateId(lbinboundprefix, null);
        LBAddPool2 = suite.isMocked ? LBAddPool2 : suite.generateId(LBAddPool2, null);
        lbinboundprefix2 = suite.isMocked ? lbinboundprefix2 : suite.generateId(lbinboundprefix2, null);

        done();
      });
    });

    after(function(done) {
      networkUtil.deleteUsedLB(groupName, LBName, suite, function(result) {
        networkUtil.deleteUsedSubnet(groupName, vnetPrefix, subnetprefix, suite, function(result) {
          networkUtil.deleteUsedVnet(groupName, vnetPrefix, suite, function(result) {
            networkUtil.deleteUsedPublicIp(groupName, publicipPrefix, suite, function(result) {
              networkUtil.deleteUsedNsg(groupName, nsgName, suite, function(result) {
                networkUtil.deleteUsedGroup(groupName, suite, function(result) {
                  suite.teardownSuite(done);
                });
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

    describe('nic', function() {
      it('create should pass', function(done) {
        networkUtil.createGroup(groupName, location, suite, function(result) {
          networkUtil.createVnet(groupName, vnetPrefix, location, suite, function(result) {
            networkUtil.createSubnet(groupName, vnetPrefix, subnetprefix, suite, function(result) {
              networkUtil.showSubnet(groupName, vnetPrefix, subnetprefix, suite, function(result) {
                networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function(result) {
                  networkUtil.showPublicIp(groupName, publicipPrefix, suite, function(result) {
                    networkUtil.createLB(groupName, LBName, location, suite, function(result) {
                      networkUtil.createFrontendIp(groupName, LBName, FrontendIpName, networkTestUtil.publicIpId, suite, function(result) {
                        networkUtil.createLbInboundNatRule(groupName, LBName, lbinboundprefix, protocol, frontendport, backendport, enablefloatingip, FrontendIpName, suite, function(result) {
                          networkUtil.createLbAddressPool(groupName, LBName, LBAddPool, suite, function(result) {
                            networkUtil.showLB(groupName, LBName, suite, function(result) {
                              networkUtil.createNSG(groupName, nsgName, location, suite, function(result) {
                                networkUtil.showNSG(groupName, nsgName, suite, function(result) {
                                  var cmd = util.format('network nic create %s %s %s -t %s -u %s -k %s -m %s -w %s -o %s -a %s -d %s -e %s -r %s -f %s --json',
                                    groupName, nicPrefix, location, tagVal, networkTestUtil.subnetId, subnetprefix, vnetPrefix, networkTestUtil.nsgId, nsgName, privateIP, networkTestUtil.lbaddresspoolId, networkTestUtil.lbinboundruleId, internalDnsLabel, enableIpForwarding).split(' ');
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
                });
              });
            });
          });
        });
      });
      it('set should modify nic', function(done) {
        var cmd = util.format('network nic set %s %s -t %s -w %s -o %s -a %s -u %s -k %s -d %s -e %s -r %s -f %s --json', groupName, nicPrefix, tagValN, networkTestUtil.nsgId, 'NoSuchNSGExists', privateIP2, networkTestUtil.subnetId, 'NoSuchSubnetExists', networkTestUtil.lbaddresspoolId, networkTestUtil.lbinboundruleId, internalDnsLabelN, enableIpForwardingN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('address-pool add with address-pool id option', function(done) {
        networkUtil.createLbAddressPool(groupName, LBName, LBAddPool2, suite, function(result) {
          networkUtil.showLB(groupName, LBName, suite, function(result) {
            var cmd = util.format('network nic address-pool add %s %s -i %s --json', groupName, nicPrefix, networkTestUtil.lbaddresspoolId2).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      it('address-pool remove with address-pool id option', function(done) {
        var cmd = util.format('network nic address-pool remove %s %s -i %s --json', groupName, nicPrefix, networkTestUtil.lbaddresspoolId2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('inbound-nat-rule add with inbound-nat-rule id option', function(done) {
        networkUtil.createLbInboundNatRule(groupName, LBName, lbinboundprefix2, protocol2, frontendport2, backendport2, enablefloatingip2, FrontendIpName, suite, function(result) {
          networkUtil.showLB(groupName, LBName, suite, function(result) {
            var cmd = util.format('network nic inbound-nat-rule add %s %s -i %s --json', groupName, nicPrefix, networkTestUtil.lbinboundruleId2).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      it('inbound-nat-rule remove with inbound-nat-rule id option', function(done) {
        var cmd = util.format('network nic inbound-nat-rule remove %s %s -i %s --json', groupName, nicPrefix, networkTestUtil.lbinboundruleId2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('address-pool add with address-pool name option', function(done) {
        var cmd = util.format('network nic address-pool add %s %s -l %s -a %s --json', groupName, nicPrefix, LBName, LBAddPool2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('address-pool remove with address-pool name option', function(done) {
        var cmd = util.format('network nic address-pool remove %s %s -l %s -a %s --json', groupName, nicPrefix, LBName, LBAddPool2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('inbound-nat-rule add with inbound-nat-rule name option', function(done) {
        var cmd = util.format('network nic inbound-nat-rule add %s %s -l %s -r %s --json', groupName, nicPrefix, LBName, lbinboundprefix2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('inbound-nat-rule remove with inbound-nat-rule name option', function(done) {
        var cmd = util.format('network nic inbound-nat-rule remove %s %s -l %s -r %s --json', groupName, nicPrefix, LBName, lbinboundprefix2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details about nic', function(done) {
        var cmd = util.format('network nic show %s %s --json', groupName, nicPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(nicPrefix);
          done();
        });
      });
      it('list should display all nic in group', function(done) {
        var cmd = util.format('network nic list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function(res) {
            return res.name === nicPrefix;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete nic', function(done) {
        var cmd = util.format('network nic delete %s %s --quiet --json', groupName, nicPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });
  });
});