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

var testPrefix = 'arm-network-express-route-tests',
  groupName = 'xplat-test-express-route-circuit',
  location;

var circuitProp = {
  name: 'test-circuit',
  serviceProviderName: 'InterCloud',
  peeringLocation: 'London',
  bandwidthInMbps: 100,
  newBandwidthInMbps: 500,
  skuTier: 'Standard',
  skuFamily: 'MeteredData',
  newSkuTier: 'Premium',
  newSkuFamily: 'UnlimitedData',
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

        circuitProp.group = groupName;
        circuitProp.location = location;
        circuitProp.name = suite.isMocked ? circuitProp.name : suite.generateId(circuitProp.name, null);

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

    describe('express-route', function () {
      it('create should create express route circuit', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          var cmd = 'network express-route circuit create -g {group} -n {name} -l {location} -p {serviceProviderName} -i {peeringLocation} -b {bandwidthInMbps} -e {skuTier} -f {skuFamily} -t {tags} --json'.formatArgs(circuitProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var circuit = JSON.parse(result.text);
            circuit.name.should.equal(circuitProp.name);
            circuit.serviceProviderProperties.serviceProviderName.should.equal(circuitProp.serviceProviderName);
            circuit.serviceProviderProperties.peeringLocation.should.equal(circuitProp.peeringLocation);
            circuit.serviceProviderProperties.bandwidthInMbps.should.equal(circuitProp.bandwidthInMbps);
            circuit.sku.tier.should.equal(circuitProp.skuTier);
            circuit.sku.family.should.equal(circuitProp.skuFamily);
            networkUtil.shouldBeSucceeded(circuit);
            done();
          });
        });
      });
      it('provider list should list available providers', function (done) {
        var cmd = 'network express-route provider list --json';
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var providers = JSON.parse(result.text);
          providers.should.be.an.Array;
          done();
        });
      });
      it('set should modify express route circuit', function (done) {
        var cmd = 'network express-route circuit set -g {group} -n {name} -b {newBandwidthInMbps} -e {newSkuTier} -f {newSkuFamily} -t {newTags} --json'
          .formatArgs(circuitProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var circuit = JSON.parse(result.text);
          circuit.name.should.equal(circuitProp.name);
          circuit.serviceProviderProperties.bandwidthInMbps.should.equal(circuitProp.newBandwidthInMbps);
          circuit.sku.tier.should.equal(circuitProp.newSkuTier);
          circuit.sku.family.should.equal(circuitProp.newSkuFamily);
          networkUtil.shouldBeSucceeded(circuit);
          networkUtil.shouldAppendTags(circuit);
          done();
        });
      });
      it('show should display details of express route circuit', function (done) {
        var cmd = 'network express-route circuit show -g {group} -n {name} --json'.formatArgs(circuitProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var circuit = JSON.parse(result.text);
          circuit.name.should.equal(circuitProp.name);
          done();
        });
      });
      it('list should display express route circuits in resource group', function (done) {
        var cmd = 'network express-route circuit list -g {group} --json'.formatArgs(circuitProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var circuits = JSON.parse(result.text);
          _.some(circuits, function (circuit) {
            return circuit.name === circuitProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete express route circuit', function (done) {
        var cmd = 'network express-route circuit delete -g {group} -n {name} --quiet --json'.formatArgs(circuitProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network express-route circuit show -g {group} -n {name} --json'.formatArgs(circuitProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var circuit = JSON.parse(result.text);
            circuit.should.be.empty;
            done();
          });
        });
      });
    });
  });
});