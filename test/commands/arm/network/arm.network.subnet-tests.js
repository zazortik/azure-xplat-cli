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
var testprefix = 'arm-network-subnet-tests';
var vnetPrefix = 'xplatTestVnet';
var subnetprefix = 'xplatTestSubnet';
var AddPrefix = '10.0.0.0/24';
var subnetprefix2 = 'xplatTest2Subnet';
var AddPrefix2 = '10.0.1.0/24';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName, location, groupPrefix = 'xplatTestGCreateSubnet';
var RouteTablePrefix = 'ArmRtTblSubnet';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];
var nsgName = 'xplatTestNsg';

describe('arm', function() {
  describe('network vnet', function() {
    var suite,
      retry = 5;
    var networkUtil = new networkTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
        subnetprefix = suite.isMocked ? subnetprefix : suite.generateId(subnetprefix, null);
        subnetprefix2 = suite.isMocked ? subnetprefix2 : suite.generateId(subnetprefix2, null);
        nsgName = suite.isMocked ? nsgName : suite.generateId(nsgName, null);
        RouteTablePrefix = suite.isMocked ? RouteTablePrefix : suite.generateId(RouteTablePrefix, null);
        done();
      });
    });
    after(function(done) {
      networkUtil.deleteUsedVnet(groupName, vnetPrefix, suite, function(result) {
        networkUtil.deleteRouteTable(groupName, RouteTablePrefix, suite, function() {
          networkUtil.deleteUsedGroup(groupName, suite, function(result) {
            suite.teardownSuite(done);
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

    describe('subnet', function() {

      it('create should create a subnet using nsg_id param', function(done) {
        networkUtil.createGroup(groupName, location, suite, function(result) {
          networkUtil.createVnet(groupName, vnetPrefix, location, suite, function(result) {
            networkUtil.createNSG(groupName, nsgName, location, suite, function(result) {
              networkUtil.showNSG(groupName, nsgName, suite, function(result) {
                networkUtil.createRouteTable(groupName, RouteTablePrefix, location, suite, function() {
                  var cmd = util.format('network vnet subnet create %s %s %s -a %s -w %s -o %s -r %s --json', groupName, vnetPrefix, subnetprefix, AddPrefix, networkTestUtil.nsgId, nsgName, RouteTablePrefix).split(' ');
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
      it('create should create a subnet using nsg name param', function(done) {
        var cmd = util.format('network vnet subnet create %s %s %s -a %s -o %s -r %s --json', groupName, vnetPrefix, subnetprefix2, AddPrefix2, nsgName, RouteTablePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });

      });
      it('set should set a subnet using nsg name param', function(done) {
        var cmd = util.format('network vnet subnet set %s %s %s -a %s -o %s -r %s --json', groupName, vnetPrefix, subnetprefix2, AddPrefix2, nsgName, RouteTablePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });

      });
      it('list should display all subnets from vnet', function(done) {
        var cmd = util.format('network vnet subnet list %s %s --json', groupName, vnetPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function(res) {
            return res.name === subnetprefix;
          }).should.be.true;
          done();
        });
      });
      it('set should modify a subnet using nsg_id param', function(done) {
        var cmd = util.format('network vnet subnet set -a 10.0.3.0/24 %s %s %s -w %s -o %s --json', groupName, vnetPrefix, subnetprefix, networkTestUtil.nsgId, 'NoSuchNSGExist').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display deatails about subnet', function(done) {
        var cmd = util.format('network vnet subnet show %s %s %s --json ', groupName, vnetPrefix, subnetprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(subnetprefix);
          done();
        });
      });
      it('delete should delete subnet', function(done) {
        var cmd = util.format('network vnet subnet delete %s %s %s --quiet --json', groupName, vnetPrefix, subnetprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });
  });
});
