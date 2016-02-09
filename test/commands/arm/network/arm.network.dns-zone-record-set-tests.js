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
var testprefix = 'arm-network-dns-record-set-tests';
var networkTestUtil = require('../../../util/networkTestUtil');
var groupName, location,
  groupPrefix = 'xplatTestGCreateDR',
  dnszonePrefix = 'xplattestgcreatedr.xplattestdrs',
  dnszoneRecPrefix = 'xplattestdnsrecord',
  tag = 'priority=medium;size=high',
  Dnstype = 'A';

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
        dnszonePrefix = suite.isMocked ? dnszonePrefix : suite.generateId(dnszonePrefix, null);
        dnszoneRecPrefix = suite.isMocked ? dnszoneRecPrefix : suite.generateId(dnszoneRecPrefix, null);
        done();
      });
    });
    after(function(done) {
      networkUtil.deleteUsedDns(groupName, dnszonePrefix, suite, function() {
        networkUtil.deleteGroup(groupName, suite, function() {
          suite.teardownSuite(done);
        });
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('dns-record-set', function() {

      it('create should create a dns-record-set', function(done) {
        this.timeout(networkUtil.timeout);
        networkUtil.createGroup(groupName, location, suite, function() {
          networkUtil.createDnszone(groupName, dnszonePrefix, suite, function() {
            var cmd = util.format('network dns record-set create %s %s %s -y %s --json', groupName, dnszonePrefix, dnszoneRecPrefix, Dnstype).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
      it('list should display all dns-record-set', function(done) {
        var cmd = util.format('network dns record-set list %s %s --json', groupName, dnszonePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function(res) {
            return res.name === dnszoneRecPrefix;
          }).should.be.true;
          done();
        });
      });
      it('set should set a dns-record-set', function(done) {
        var cmd = util.format('network dns record-set set %s %s %s %s -l 255 --json', groupName, dnszonePrefix, dnszoneRecPrefix, Dnstype).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('show should display details of a dns-record-set', function(done) {
        var cmd = util.format('network dns record-set show %s %s %s %s --json', groupName, dnszonePrefix, dnszoneRecPrefix, Dnstype).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(dnszoneRecPrefix);
          done();
        });
      });

      it('add-record should add a record in dns-record-set', function(done) {
        var cmd = util.format('network dns record-set add-record %s %s %s %s -a 10.0.0.0 --json', groupName, dnszonePrefix, dnszoneRecPrefix, Dnstype).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });


      it('delete-record should delete a record from dns-record-set', function(done) {
        var cmd = util.format('network dns record-set delete-record %s %s %s %s -a 10.0.0.0 -q --json', groupName, dnszonePrefix, dnszoneRecPrefix, Dnstype).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('delete should delete dns-record-set', function(done) {
        var cmd = util.format('network dns record-set delete %s %s %s %s --quiet --json', groupName, dnszonePrefix, dnszoneRecPrefix, Dnstype).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });
  });
});