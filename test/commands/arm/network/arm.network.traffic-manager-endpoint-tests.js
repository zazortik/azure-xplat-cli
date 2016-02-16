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
var testprefix = 'arm-network-traffic-manager-endpoint-tests';
var NetworkTestUtil = require('../../../util/networkTestUtil');
var groupPrefix = 'xplatTestGTMPEndpt';
var groupName,
  location,
  trafficMPPrefix = 'xplatTestTMPE',
  trafficMPEndPtPrefix = 'xplatTestTMPEndPoint',
  trafficMPEndPtPrefixNest = 'xplatTestTMPEndPointNest',
  reldns = 'xplatTMPEndptdns';
var profile_status = 'Enabled',
  routing_method = 'Weighted',
  time_to_live = '300',
  monitor_protocol = 'http',
  monitor_path = '/index.html',
  monitor_port = '80';

var endptType = 'ExternalEndpoints',
  endptTarget,
  endpointStatus = 'Enabled',
  endptWeight = '100',
  endptPriority = '322';
var endptTypeN = 'NestedEndpoints',
  endptTypeA = 'AzureEndpoints',
  endptTargetN,
  publicipPrefix = 'xplattestpi',
  endpointStatusN = 'Disabled',
  endptWeightN = '120',
  endptPriorityN = '300';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite,
      retry = 5;
    var networkUtil = new NetworkTestUtil();
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        trafficMPPrefix = suite.isMocked ? trafficMPPrefix : suite.generateId(trafficMPPrefix, null);
        trafficMPEndPtPrefix = suite.isMocked ? trafficMPEndPtPrefix : suite.generateId(trafficMPEndPtPrefix, null);
        publicipPrefix = suite.isMocked ? publicipPrefix : suite.generateId(publicipPrefix, null);
        reldns = suite.generateId(reldns, null);
        endptTarget = reldns + '.azure.com';
        endptTargetN = reldns + '.foo.com';
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

    describe('traffic-manager endpoint', function () {

      it('create External Endpoints type should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createTrafficManagerProfile(groupName, trafficMPPrefix, profile_status, routing_method, reldns, time_to_live, monitor_protocol, monitor_port, monitor_path, suite, function () {
            var cmd = util.format('network traffic-manager endpoint create %s %s %s -l %s -y %s -t %s -u %s -w %s -p %s --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix, location, endptType, endptTarget, endpointStatus, endptWeight, endptPriority).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
	    // TODO: NestedEndpoints not fully supported on server end
      // it('create Nested Endpoints type should pass', function(done) {
      // networkUtil.createPublicIpdns(groupName, publicipPrefix, location, suite, function() {
      // networkUtil.showPublicIp(groupName, publicipPrefix, suite, function() {
      // var cmd = util.format('network traffic-manager endpoint create %s %s %s -l %s -y %s -i %s -u %s -w %s -p %s --json', groupName, trafficMPPrefix, trafficMPEndPtPrefixNest, location, endptTypeN, networkTestUtil.publicIpId, endpointStatus, endptWeight, endptPriorityN).split(' ');
      // testUtils.executeCommand(suite, retry, cmd, function(result) {
      // result.exitStatus.should.equal(0);
      // done();
      // });
      // });
      // });
      // });
      it('show should display details of profile endpoint', function (done) {
        var cmd = util.format('network traffic-manager endpoint show %s %s %s %s --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix, endptType).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(trafficMPEndPtPrefix);
          done();
        });
      });
      it('set should modify profile endpoint', function (done) {
        var cmd = util.format('network traffic-manager endpoint set %s %s %s -y %s -t %s -u %s -w %s -p %s --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix, endptType, endptTargetN, endpointStatusN, endptWeightN, endptPriorityN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('delete should delete profile endpoint', function (done) {
        var cmd = util.format('network traffic-manager endpoint delete %s %s %s %s --quiet --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix, endptType).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

  });
});