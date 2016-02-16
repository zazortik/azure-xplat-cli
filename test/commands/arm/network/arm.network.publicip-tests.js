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

var location,
  testPrefix = 'arm-network-publicip-tests',
  groupName = 'xplat-test-public-ip',
  publicIpName = 'test-ip',
  domainName = 'foo-domain',
  newDomainName = 'bar-domain',
  staticMethod = 'Static',
  dynamicMethod = 'Dynamic',
  idleTimeout = 4,
  newTimeout = 15;

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;
    var networkUtil = new NetworkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        domainName = suite.generateId(domainName, null);
        newDomainName = suite.generateId(newDomainName, null);
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        publicIpName = suite.generateId(publicIpName, null);
        location = process.env.AZURE_VM_TEST_LOCATION;

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

    describe('publicip', function () {
      it('create should create publicip', function (done) {
        networkUtil.createGroup(groupName, location, suite, function() {
          var cmd = util.format('network public-ip create -g %s -n %s -l %s -d %s -a %s -i %s -t %s --json',
            groupName, publicIpName, location, domainName, staticMethod, idleTimeout, networkUtil.tags);

          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var ip = JSON.parse(result.text);
            ip.name.should.equal(publicIpName);
            networkUtil.shouldBeSucceeded(ip);
            done();
          });
        });
      });
      it('set should modify publicip', function (done) {
        var cmd = util.format('network public-ip set -g %s -n %s -d %s -a %s -i %s -t %s --json',
          groupName, publicIpName, newDomainName, dynamicMethod, newTimeout, networkUtil.newTags);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var ip = JSON.parse(result.text);
          ip.name.should.equal(publicIpName);
          ip.publicIPAllocationMethod.should.equal(dynamicMethod);
          ip.idleTimeoutInMinutes.should.equal(newTimeout);
          networkUtil.shouldAppendTags(ip);
          networkUtil.shouldBeSucceeded(ip);
          done();
        });
      });
      it('show should display publicip details', function (done) {
        var cmd = util.format('network public-ip show %s %s --json', groupName, publicIpName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var ip = JSON.parse(result.text);
          ip.name.should.equal(publicIpName);
          done();
        });
      });
      it('list should display all publicips in resource group', function (done) {
        var cmd = util.format('network public-ip list -g %s --json', groupName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var ips = JSON.parse(result.text);
          _.some(ips, function (ip) {
            return ip.name === publicIpName;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete publicip', function (done) {
        var cmd = util.format('network public-ip delete %s %s --quiet --json', groupName, publicIpName);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('network public-ip show %s %s --json', groupName, publicIpName);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var ip = JSON.parse(result.text);
            ip.should.be.empty;
            done();
          });
        });
      });

    });
  });
});