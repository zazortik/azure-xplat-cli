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
var testprefix = 'arm-network-express-route-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var _ = require('underscore');
var groupName, location,
  groupPrefix = 'xplatTestGExpressRoute';
var expressRCPrefix = 'xplatExpressRoute',
  serviceProvider = 'InterCloud',
  peeringLocation = 'London',
  bandwidth2 = '70',
  skuTier = 'Standard',
  skuFamily = 'MeteredData',
  skuTier2 = 'Premium',
  skuFamily2 = 'UnlimitedData',
  tags1 = 'tag1=val1';

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
        expressRCPrefix = suite.isMocked ? expressRCPrefix : suite.generateId(expressRCPrefix, null);
        done();
      });
    });
    after(function(done) {
      networkUtil.deleteGroup(groupName, suite, function() {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('express-route', function() {
      it('create should pass', function(done) {
        networkUtil.createGroup(groupName, location, suite, function() {
          var cmd = util.format('network express-route circuit create %s %s %s -p %s -i %s -b 50 -e %s -f %s -t %s --json', groupName, expressRCPrefix, location, serviceProvider, peeringLocation, skuTier, skuFamily, tags1).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('set should modify express-route', function(done) {
        var cmd = util.format('network express-route circuit set %s %s -e %s -f %s --json', groupName, expressRCPrefix, skuTier2, skuFamily2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details of express-route', function(done) {
        var cmd = util.format('network express-route circuit show %s %s --json', groupName, expressRCPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(expressRCPrefix);
          done();
        });
      });
      it('list should dispaly all express-routes from resource group', function(done) {
        var cmd = util.format('network express-route circuit list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          _.some(allResources, function(res) {
            return res.name === expressRCPrefix;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete express-route', function(done) {
        var cmd = util.format('network express-route circuit delete %s %s --quiet --json', groupName, expressRCPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('provider list', function(done) {
        var cmd = util.format('network express-route provider list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});