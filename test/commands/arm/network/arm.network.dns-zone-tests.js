/**
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
  dnsZonePrefixImport = 'example1.com',
  importFilePath = 'test/data/zone_file_origin.txt',
  mergeFilePath = 'test/data/merge1.txt',
  tag = 'priority=medium;size=high';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];


describe('arm', function() {
  describe('network', function() {
    var suite,
      timeout,
      retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;
    var networkUtil = new networkTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        dnszonePrefix = suite.isMocked ? dnszonePrefix : suite.generateId(dnszonePrefix, null);
        //dnsZonePrefixImport = suite.isMocked ? dnsZonePrefixImport : suite.generateId(dnsZonePrefixImport, null);
        done();
      });
    });
    after(function(done) {
      this.timeout(networkUtil.timeout);
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

    describe('dns zone', function() {
      it('create should pass', function(done) {
        networkUtil.createGroup(groupName, location, suite, function() {
          var cmd = util.format('network dns zone create %s %s --json', groupName, dnszonePrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });

        });
      });

      it('set should set dns-zone', function(done) {
        var cmd = util.format('network dns zone set %s %s %s --json', groupName, dnszonePrefix, tag).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('show should display dns-zone', function(done) {
        var cmd = util.format('network dns zone show %s %s --json', groupName, dnszonePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allresources = JSON.parse(result.text);
          allresources.name.should.equal(dnszonePrefix);
          done();
        });
      });

      it('list should display all dns-zones', function(done) {
        var cmd = util.format('network dns zone list %s --json', groupName).split(' ');
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
        var cmd = util.format('network dns zone delete %s %s --quiet --json', groupName, dnszonePrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
	  
      it('parse-only import should parse the file', function(done) {
        var cmd = util.format('network dns zone import %s %s %s --parse-only --json', groupName, dnsZonePrefixImport, importFilePath).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('import should import dns-zone', function(done) {
        var cmd = util.format('network dns zone import %s %s %s --json', groupName, dnsZonePrefixImport, importFilePath).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('force overwrite of existing record sets in dns-zone', function(done) {
        var cmd = util.format('network dns zone import %s %s %s --force --json', groupName, dnsZonePrefixImport, mergeFilePath).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});