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
var testprefix = 'arm-network-traffic-manager-tests';
var groupPrefix = 'xplatTestGTMPCreate';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName,
  location,
  trafficMPPrefix = 'xplatTestTrafficMP',
  reldns = 'xplatTMPdns';
var profile_status = 'Enabled',
  routing_method = 'Performance',
  time_to_live = '300',
  monitor_protocol = 'http',
  monitor_path = '/index.html',
  monitor_port = '80';
var profile_statusN = 'Disabled',
  routing_methodN = 'Weighted',
  time_to_liveN = '200',
  monitor_pathN = '/indextest.html';

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
        trafficMPPrefix = suite.isMocked ? trafficMPPrefix : suite.generateId(trafficMPPrefix, null);
        reldns = suite.generateId(reldns, null);
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

    describe('traffic-manager profile', function () {

      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = util.format('network traffic-manager profile create %s %s -u %s -m %s -r %s -l %s -p %s -o %s -a %s --json', groupName, trafficMPPrefix, profile_status, routing_method, reldns, time_to_live, monitor_protocol, monitor_port, monitor_path).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('list should get all traffic-manager profiles from resource group', function (done) {
        var cmd = util.format('network traffic-manager profile list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function (res) {
            return res.name === trafficMPPrefix;
          }).should.be.true;
          done();
        });
      });

      it('set should modify traffic-manager profile', function (done) {
        var cmd = util.format('network traffic-manager profile set %s %s -u %s -m %s -l %s -p %s -o %s -a %s --json', groupName, trafficMPPrefix, profile_statusN, routing_methodN, time_to_liveN, monitor_protocol, monitor_port, monitor_pathN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(trafficMPPrefix);
          done();
        });
      });

      it('show should display details of traffic-manager profile', function (done) {
        var cmd = util.format('network traffic-manager profile show %s %s --json', groupName, trafficMPPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(trafficMPPrefix);
          done();
        });
      });

      it('is-dns-available checks specified DNS prefix is available for creating traffic-manager profile', function (done) {
        var cmd = util.format('network traffic-manager profile is-dns-available %s --json', reldns).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.nameAvailable.should.equal(false);
          done();
        });
      });

      it('delete should delete traffic-manager profile', function (done) {
        var cmd = util.format('network traffic-manager profile delete %s %s -q --json', groupName, trafficMPPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});