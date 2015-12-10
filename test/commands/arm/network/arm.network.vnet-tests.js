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
var testprefix = 'arm-network-vnet-tests';
var vnetPrefix = 'xplatTestVnet';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName, location,
  groupPrefix = 'xplatTestGCreatevnet',
  dnsAdd = '8.8.8.8',
  dnsAdd1 = '8.8.4.4',
  AddPrefix = '10.0.0.0/12';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];
var skiptest = it.skip;
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
        vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
        done();
      });
    });
    after(function(done) {
      // deleteUsedGroup(function() {
      // suite.teardownSuite(done);
      // });
      networkUtil.deleteUsedGroup(groupName, suite, function(result) {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('vnet', function() {

      it('create should pass', function(done) {
        //createGroup(function(){
        networkUtil.createGroup(groupName, location, suite, function(result) {
          var cmd = util.format('network vnet create %s %s %s -a %s -t priority=low;size=small -d %s --json', groupName, vnetPrefix, location, AddPrefix, dnsAdd).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('set should modify vnet', function(done) {

        var cmd = util.format('network vnet set %s %s -d %s --json', groupName, vnetPrefix, dnsAdd1).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details of vnet', function(done) {
        var cmd = util.format('network vnet show %s %s --json', groupName, vnetPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(vnetPrefix);
          done();
        });
      });
      it('list should dispaly all vnets from resource group', function(done) {
        var cmd = util.format('network vnet list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function(res) {
            return res.name === vnetPrefix;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete vnet', function(done) {
        var cmd = util.format('network vnet delete %s %s --quiet --json', groupName, vnetPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});