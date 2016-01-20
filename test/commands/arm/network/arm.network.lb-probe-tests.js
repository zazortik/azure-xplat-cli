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
var testprefix = 'arm-network-lb-probe-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName,
  location,
  groupPrefix = 'xplatTestGCreateLbProbe',
  publicipPrefix = 'xplatTestIpLbProbe',
  LBName = 'xplattestlbLbProbe',
  FrontendIpName = 'xplattestFrontendIpName',
  lbprobePrefix = 'xplatTestLbProbe';
var publicIpId;
var protocol = 'http',
  port = '80',
  path = 'healthcheck.aspx',
  interval = '5',
  count = '2';
var protocolNew = 'tcp',
  portNew = '66',
  pathNew = 'newpage.aspx',
  intervalNew = '10',
  countNew = '3';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];


describe('arm', function () {
  describe('network', function () {
    var suite, timeout,
      retry = 5;
    var networkUtil = new networkTestUtil();
    testUtils.TIMEOUT_INTERVAL = 5000;

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        LBName = suite.isMocked ? LBName : suite.generateId(LBName, null);
        lbprobePrefix = suite.isMocked ? lbprobePrefix : suite.generateId(lbprobePrefix, null);
        FrontendIpName = suite.isMocked ? FrontendIpName : suite.generateId(FrontendIpName, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteUsedLB(groupName, LBName, suite, function () {
        networkUtil.deleteUsedPublicIp(groupName, publicipPrefix, suite, function () {
          networkUtil.deleteUsedGroup(groupName, suite, function () {
            suite.teardownSuite(done);
          });
        });
      });
    });
    beforeEach(function (done) {
      suite.setupTest(function () {
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('lb probe', function () {

      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, LBName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicipPrefix, location, suite, function () {
              networkUtil.showPublicIp(groupName, publicipPrefix, suite, function () {
                networkUtil.createFrontendIp(groupName, LBName, FrontendIpName, networkTestUtil.publicIpId, suite, function () {
                  var cmd = util.format('network lb probe create %s %s %s -p %s -o %s -f %s -i %s -c %s --json',
                    groupName, LBName, lbprobePrefix, protocol, port, path, interval, count).split(' ');
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
      it('list should dispaly all probes in load balancer', function (done) {
        var cmd = util.format('network lb probe list %s %s --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function (res) {
            return res.name === lbprobePrefix;
          }).should.be.true;
          done();
        });
      });
      it('set should modify probe', function (done) {
        var cmd = util.format('network lb probe set %s %s %s  -p %s -o %s -f %s -i %s -c %s --json', groupName, LBName, lbprobePrefix, protocolNew, portNew, pathNew, intervalNew, countNew).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('delete should delete the probe', function (done) {
        var cmd = util.format('network lb probe delete %s %s %s --quiet --json', groupName, LBName, lbprobePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});