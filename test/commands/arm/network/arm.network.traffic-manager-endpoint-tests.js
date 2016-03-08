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
var _ = require('underscore');

var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();

var testPrefix = 'arm-network-traffic-manager-endpoint-tests',
  groupName = 'xplat-test-traffic-manager-profile',
  location;

var endpointProp = {
  name: 'test-enpoint',
  type: 'ExternalEndpoints',
  status: 'Enabled',
  newStatus: 'Disabled',
  weight: 100,
  newWeight: 101,
  priority: 200,
  newPriority: 202
};

var profileProp = {
  name: 'test-profile',
  relativeDnsName: 'test-profile-dns',
  profileStatus: 'Enabled',
  trafficRoutingMethod: 'Performance',
  ttl: 300,
  monitorProtocol: 'HTTP',
  monitorPort: 80,
  monitorPath: '/healthcheck.html',
  tags: networkUtil.tags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        profileProp.group = groupName;
        profileProp.location = location;
        profileProp.name = suite.isMocked ? profileProp.name : suite.generateId(profileProp.name, null);
        profileProp.relativeDnsName = suite.isMocked ? profileProp.relativeDnsName : suite.generateId(profileProp.relativeDnsName, null);

        endpointProp.group = groupName;
        endpointProp.location = location;
        endpointProp.profileName = profileProp.name;
        endpointProp.name = suite.isMocked ? endpointProp.name : suite.generateId(endpointProp.name, null);
        endpointProp.target = profileProp.relativeDnsName + '.azure.com';
        endpointProp.newTarget = 'foobar' + endpointProp.target;

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
      it('create should create endpoint in traffic manager profile', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createTrafficManagerProfile(profileProp, suite, function () {
            var cmd = 'network traffic-manager endpoint create -g {group} -f {profileName} -n {name} -l {location} -y {type} -t {target} -u {status} -w {weight} -p {priority} --json'
              .formatArgs(endpointProp);

            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              var endpoint = JSON.parse(result.text);
              endpoint.name.should.equal(endpointProp.name);
              endpoint.properties.target.should.equal(endpointProp.target);
              endpoint.properties.endpointStatus.should.equal(endpointProp.status);
              endpoint.properties.weight.should.equal(endpointProp.weight);
              endpoint.properties.priority.should.equal(endpointProp.priority);
              done();
            });
          });
        });
      });
      it('set should modify endpoint in traffic manager profile', function (done) {
        var cmd = 'network traffic-manager endpoint set -g {group} -f {profileName} -n {name} -y {type} -t {newTarget} -u {newStatus} -w {newWeight} -p {newPriority} --json'
          .formatArgs(endpointProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var endpoint = JSON.parse(result.text);
          endpoint.name.should.equal(endpointProp.name);
          endpoint.properties.target.should.equal(endpointProp.newTarget);
          endpoint.properties.endpointStatus.should.equal(endpointProp.newStatus);
          endpoint.properties.weight.should.equal(endpointProp.newWeight);
          endpoint.properties.priority.should.equal(endpointProp.newPriority);
          done();
        });
      });
      it('show should display details of endpoint in traffic manager profile', function (done) {
        var cmd = 'network traffic-manager endpoint show -g {group} -f {profileName} -n {name} -y {type} --json'.formatArgs(endpointProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var endpoint = JSON.parse(result.text);
          endpoint.name.should.equal(endpointProp.name);
          done();
        });
      });
      it('delete should delete endpoint in traffic manager profile', function (done) {
        var cmd = 'network traffic-manager endpoint delete -g {group} -f {profileName} -n {name} -y {type} --quiet --json'.formatArgs(endpointProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network traffic-manager endpoint show -g {group} -f {profileName} -n {name} -y {type} --json'.formatArgs(endpointProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var endpoint = JSON.parse(result.text);
            endpoint.should.be.empty;
            done();
          });
        });
      });
    });
  });
});