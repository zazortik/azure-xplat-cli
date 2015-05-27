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
var testprefix = 'arm-network-dns-zone-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName,
  location,
  groupPrefix = 'xplatTestGCreateDns',
  dnszonePrefix = 'xplattestgcreatedns.xplattestdns',
  tag = 'priority=medium;size=high';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
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
        dnszonePrefix = suite.isMocked ? dnszonePrefix : suite.generateId(dnszonePrefix, null);
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

    describe('dns-zone', function() {
      it('create should pass', function(done) {
        networkUtil.createGroup(groupName, location, suite, function() {
          var cmd = util.format('network dns-zone create %s %s --json', groupName, dnszonePrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });

        });
      });

      it('set should set dns-zone', function(done) {
        var cmd = util.format('network dns-zone set %s %s %s --json', groupName, dnszonePrefix, tag).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('show should display dns-zone', function(done) {
        var cmd = util.format('network dns-zone show %s %s --json', groupName, dnszonePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(dnszonePrefix);
          done();
        });
      });

      it('list should display all dns-zones', function(done) {
        var cmd = util.format('network dns-zone list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function(res) {
            return res.name === dnszonePrefix;
          }).should.be.true;
          done();
        });
      });

      it('delete should delete dns-zone', function(done) {
        var cmd = util.format('network dns-zone delete %s %s --quiet --json', groupName, dnszonePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});