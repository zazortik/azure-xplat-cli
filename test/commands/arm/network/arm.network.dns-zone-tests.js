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

var testPrefix = 'arm-network-dns-zone-tests',
  groupName = 'xplat-test-dns-zone',
  location;

var zoneProp = {
  name: 'example1.com',
  importPath: 'test/data/zone_file_import.txt',
  exportPath: 'test/data/zone_file_export.txt',
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        zoneProp.location = location;
        zoneProp.group = groupName;

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

    describe('dns zone', function () {
      it('create should create dns zone', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createDnsZone(zoneProp, suite, function(zone) {
            networkUtil.shouldHaveTags(zone);
            done();
          });
        });
      });
      it('set should modify dns zone', function (done) {
        var cmd = 'network dns zone set -g {group} -n {name} -t {newTags} --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var zone = JSON.parse(result.text);
          zone.name.should.equal(zoneProp.name);
          networkUtil.shouldAppendTags(zone);
          done();
        });
      });
      it('show should display details of dns zone', function (done) {
        var cmd = 'network dns zone show -g {group} -n {name} --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var zone = JSON.parse(result.text);
          zone.name.should.equal(zoneProp.name);
          done();
        });
      });
      it('list should display all dns zones in resource group', function (done) {
        var cmd = 'network dns zone list -g {group} --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var zones = JSON.parse(result.text);
          zones.some(function (zone) {
            return zone.name === zoneProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete dns zone', function (done) {
        var cmd = 'network dns zone delete -g {group} -n {name} --quiet --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network dns zone show -g {group} -n {name} --json'.formatArgs(zoneProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var zone = JSON.parse(result.text);
            zone.should.be.empty;
            done();
          });
        });
      });
      it('import should parse zone file', function (done) {
        var cmd = 'network dns zone import -g {group} -n {name} -f {importPath} --parse-only --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var zone = JSON.parse(result.text);
          zone.should.have.property('sets');
          // TODO add more validation
          done();
        });
      });
      it('import should import dns zone from zone file', function (done) {
        var cmd = 'network dns zone import -g {group} -n {name} -f {importPath} --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          networkUtil.listDnsRecordSets(zoneProp, suite, function (sets) {
            // TODO add more validation
            done();
          });
        });
      });
      it('export should export dns zone to zone file', function (done) {
        var cmd = 'network dns zone export -g {group} -n {name} -f {exportPath} --quiet --json'.formatArgs(zoneProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network dns zone import -g {group} -n {name} -f {exportPath} --parse-only --json'.formatArgs(zoneProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var zone = JSON.parse(result.text);
            zone.should.have.property('sets');
            // TODO add more validation
            done();
          });
        });
      });
    });
  });
});