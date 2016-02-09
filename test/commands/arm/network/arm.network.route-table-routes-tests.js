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
var testprefix = 'arm-network-route-table-routes-tests';
var groupPrefix = 'xplatTestRtTblRoutes';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName, location;
var RouteTablePrefix = 'ArmRtTblRoute',
  RoutePrefix = 'ArmRoute',
  AddressPrefix = '10.0.0.0/23',
  AddressPrefixN = '10.0.1.0/23',
  NextHopType = 'VirtualNetworkGateway',
  NextHopTypeN = 'VNETLocal';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, timeout, retry = 5;
    var networkUtil = new networkTestUtil();
    testUtils.TIMEOUT_INTERVAL = 5000;

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function () {
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        RouteTablePrefix = suite.isMocked ? RouteTablePrefix : suite.generateId(RouteTablePrefix, null);
        RoutePrefix = suite.isMocked ? RoutePrefix : suite.generateId(RoutePrefix, null);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteRouteTable(groupName, RouteTablePrefix, suite, function () {
        networkUtil.deleteGroup(groupName, suite, function () {
          suite.teardownSuite(done);
        });
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('route-table route', function () {
      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createRouteTable(groupName, RouteTablePrefix, location, suite, function () {
            var cmd = util.format('network route-table route create -g %s -r %s -n %s -a %s -y %s --json', groupName, RouteTablePrefix, RoutePrefix, AddressPrefix, NextHopType).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      it('set should set route in a route-table', function (done) {
        var cmd = util.format('network route-table route set -g %s -r %s -n %s -a %s -y %s --json', groupName, RouteTablePrefix, RoutePrefix, AddressPrefixN, NextHopTypeN).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('list should display all route in a route-table ', function (done) {
        var cmd = util.format('network route-table route list -g %s -r %s  --json', groupName, RouteTablePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details about route', function (done) {
        var cmd = util.format('network route-table route show -g %s -r %s -n %s --json', groupName, RouteTablePrefix, RoutePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(RoutePrefix);
          done();
        });
      });

      it('delete should delete route in a route-table', function (done) {
        var cmd = util.format('network route-table route delete -g %s -r %s -n %s -q --json', groupName, RouteTablePrefix, RoutePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});