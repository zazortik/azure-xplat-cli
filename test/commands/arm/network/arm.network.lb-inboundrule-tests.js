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
var testprefix = 'arm-network-lb-inboundrule-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName,
  location,
  groupPrefix = 'xplatTestGCreateLbI',
  publicipPrefix = 'xplatTestIpLbI',
  LBName = 'xplattestlbLbI',
  VipName = 'xplattestVipName',
  lbinboundprefix = 'xplattestInbound';
var publicIpId;
var protocol = 'tcp',
  frontendport = '3380',
  backendport = '3380',
  enablefloatingip = 'true';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
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
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        LBName = suite.isMocked ? LBName : suite.generateId(LBName, null);
        lbinboundprefix = suite.isMocked ? lbinboundprefix : suite.generateId(lbinboundprefix, null);
        VipName = suite.isMocked ? VipName : suite.generateId(VipName, null);
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

    describe('lb-inbound-nat-rule', function () {

      it('create', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, LBName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function () {
              networkUtil.showPublicIp(groupName, publicipPrefix, suite, function () {
                networkUtil.createFIP(groupName, LBName, VipName, networkTestUtil.publicIpId, suite, function () {
                  var cmd = util.format('network lb inbound-nat-rule create %s %s %s -p %s -f %s -b %s -e %s -i %s --json',
                    groupName, LBName, lbinboundprefix, protocol, frontendport, backendport, enablefloatingip, VipName).split(' ');
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
      it('list', function (done) {
        var cmd = util.format('network lb inbound-nat-rule list %s %s --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].name.should.equal(lbinboundprefix);
          done();
        });
      });
      it('set', function (done) {
        var cmd = util.format('network lb inbound-nat-rule set %s %s %s -p udp -f 3381 -b 3381 -e false --json', groupName, LBName, lbinboundprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('delete', function (done) {
        var cmd = util.format('network lb inbound-nat-rule delete %s %s %s --quiet --json', groupName, LBName, lbinboundprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});