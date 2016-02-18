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

var testPrefix = 'arm-network-traffic-manager-tests',
  groupName = 'xplat-test-traffic-manager-profile',
  location;

var profileProp = {
  name: 'test-profile',
  relativeDnsName: 'test-profile-dns',
  profileStatus: 'Enabled',
  newProfileStatus: 'Disabled',
  trafficRoutingMethod: 'Performance',
  newTrafficRoutingMethod: 'Weighted',
  ttl: 300,
  newTtl: 400,
  monitorProtocol: 'HTTP',
  newMonitorProtocol: 'HTTPS',
  monitorPort: 80,
  newMonitorPort: 90,
  monitorPath: '/healthcheck.html',
  newMonitorPath: '/index.aspx',
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
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
      it('create should create traffic manager profile', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createTrafficManagerProfile(profileProp, suite, function (profile) {
            networkUtil.shouldHaveTags(profile);
            done();
          });
        });
      });
      it('set should modify traffic-manager profile', function (done) {
        var cmd = 'network traffic-manager profile set -g {group} -n {name} -u {newProfileStatus} -m {newTrafficRoutingMethod} -l {newTtl} -p {newMonitorProtocol} -o {newMonitorPort} -a {newMonitorPath} -t {newTags} --json'
          .formatArgs(profileProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var profile = JSON.parse(result.text);
          profile.name.should.equal(profileProp.name);
          profile.properties.profileStatus.should.equal(profileProp.newProfileStatus);
          profile.properties.trafficRoutingMethod.should.equal(profileProp.newTrafficRoutingMethod);
          profile.properties.dnsConfig.ttl.should.equal(profileProp.newTtl);
          profile.properties.monitorConfig.protocol.should.equal(profileProp.newMonitorProtocol);
          profile.properties.monitorConfig.port.should.equal(profileProp.newMonitorPort);
          profile.properties.monitorConfig.path.should.equal(profileProp.newMonitorPath);
          networkUtil.shouldAppendTags(profile);
          done();
        });
      });
      it('list should display all traffic manager profiles in resource group', function (done) {
        var cmd = 'network traffic-manager profile list -g {group} --json'.formatArgs(profileProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var profiles = JSON.parse(result.text);
          profiles.some(function (profile) {
            return profile.name === profileProp.name;
          }).should.be.true;
          done();
        });
      });
      it('show should display details of traffic manager profile', function (done) {
        var cmd = 'network traffic-manager profile show -g {group} -n {name} --json'.formatArgs(profileProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var profile = JSON.parse(result.text);
          profile.name.should.equal(profileProp.name);
          done();
        });
      });
      it('is-dns-available should check DNS prefix availability', function (done) {
        var cmd = 'network traffic-manager profile is-dns-available -r {relativeDnsName} --json'.formatArgs(profileProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var res = JSON.parse(result.text);
          res.nameAvailable.should.equal(false);
          done();
        });
      });
      it('delete should delete traffic manager profile', function (done) {
        var cmd = 'network traffic-manager profile delete -g {group} -n {name} --quiet --json'.formatArgs(profileProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network traffic-manager profile show -g {group} -n {name} --json'.formatArgs(profileProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var profile = JSON.parse(result.text);
            profile.should.be.empty;
            done();
          });
        });
      });
    });
  });
});