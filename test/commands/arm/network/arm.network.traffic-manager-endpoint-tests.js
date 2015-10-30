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
var networkTestUtil = require('../../../util/networkTestUtil');
var groupPrefix = 'xplatTestGTMPEndpt';
var groupName,
  location,
  trafficMPPrefix = 'xplatTestTMPE',
  trafficMPEndPtPrefix = 'xplatTestTMPEndPoint',
  reldns = 'xplatTMPEndptdns';
var profile_status = 'Enabled',
  routing_method = 'Weighted',
  time_to_live = '300',
  monitor_protocol = 'http',
  monitor_path = '/index.html',
  monitor_port = '80';

var endptType = 'externalEndpoint',
  endptTarget,
  endpointStatus = 'Enabled',
  endptWeight = '100',
  endptPriority = '322';
var endptTypeN = 'externalEndpoint',
  endptTargetN,
  endpointStatusN = 'Disabled',
  endptWeightN = '120',
  endptPriorityN = '300';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
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
        trafficMPPrefix = suite.isMocked ? trafficMPPrefix : suite.generateId(trafficMPPrefix, null);
        trafficMPEndPtPrefix = suite.isMocked ? trafficMPEndPtPrefix : suite.generateId(trafficMPEndPtPrefix, null);
        reldns = suite.generateId(reldns, null);
        endptTarget = reldns + '.azure.com';
        endptTargetN = reldns + '.foo.com';
        done();
      });
    });
    after(function(done) {
      networkUtil.deleteUsedGroup(groupName, suite, function() {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('traffic-manager profile endpoint', function() {

      it('create should pass', function(done) {
        networkUtil.createGroup(groupName, location, suite, function() {
          networkUtil.createTrafficManagerProfile(groupName, trafficMPPrefix, profile_status, routing_method, reldns, time_to_live, monitor_protocol, monitor_port, monitor_path, suite, function() {
            var cmd = util.format('network traffic-manager profile endpoint create %s %s %s %s -y %s -e %s -u %s -w %s -p %s  --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix, location, endptType, endptTarget, endpointStatus, endptWeight, endptPriority).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });

      it('set should pass', function(done) {
        var cmd = util.format('network traffic-manager profile endpoint set %s %s %s -y %s -e %s -u %s -w %s -p %s  --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix, endptTypeN, endptTargetN, endpointStatusN, endptWeightN, endptPriorityN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('delete should pass', function(done) {
        var cmd = util.format('network traffic-manager profile endpoint delete %s %s %s --quiet --json', groupName, trafficMPPrefix, trafficMPEndPtPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

  });
});