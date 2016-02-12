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
var networkTestUtil = require('../../../util/networkTestUtil');

var testPrefix = 'arm-network-lb-probe-tests',
  groupName = 'xplat-test-lb-probe',
  location;

var probeProp = {
  name: 'test-probe',
  protocol: 'Http',
  newProtocol: 'Tcp',
  port: 80,
  newPort: 60,
  requestPath: 'healthcheck.aspx',
  newRequestPath: 'index.html',
  intervalInSeconds: 5,
  newIntervalInSeconds: 10,
  numberOfProbes: 2,
  newNumberOfProbes: 3
};

var publicIpName = 'test-ip',
  lbName = 'test-lb',
  fipName = 'test-fip';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;
    var networkUtil = new networkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);
        lbName = suite.isMocked ? lbName : suite.generateId(lbName, null);
        publicIpName = suite.isMocked ? publicIpName : suite.generateId(publicIpName, null);
        fipName = suite.isMocked ? fipName : suite.generateId(fipName, null);

        probeProp.group = groupName;
        probeProp.lbName = lbName;
        probeProp.name = suite.isMocked ? probeProp.name : suite.generateId(probeProp.name, null);

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

    describe('lb probe', function () {
      it('create should create probe', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createLB(groupName, lbName, location, suite, function () {
            networkUtil.createPublicIp(groupName, publicIpName, location, suite, function (publicIp) {
              networkUtil.createFIP(groupName, lbName, fipName, publicIp.id, suite, function () {
                var cmd = 'network lb probe create -g {group} -l {lbName} -n {name} -p {protocol} -o {port} -f {requestPath} -i {intervalInSeconds} -c {numberOfProbes} --json'
                  .formatArgs(probeProp);

                testUtils.executeCommand(suite, retry, cmd, function (result) {
                  result.exitStatus.should.equal(0);
                  var probe = JSON.parse(result.text);
                  probe.name.should.equal(probeProp.name);
                  probe.protocol.should.equal(probeProp.protocol);
                  probe.port.should.equal(probeProp.port);
                  probe.requestPath.should.equal(probeProp.requestPath);
                  probe.intervalInSeconds.should.equal(probeProp.intervalInSeconds);
                  probe.numberOfProbes.should.equal(probeProp.numberOfProbes);
                  networkUtil.shouldBeSucceeded(probe);
                  done();
                });
              });
            });
          });
        });
      });
      it('set should modify probe', function (done) {
        var cmd = 'network lb probe set -g {group} -l {lbName} -n {name} -p {newProtocol} -o {newPort} -i {newIntervalInSeconds} -c {newNumberOfProbes} --json'
          .formatArgs(probeProp);

        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var probe = JSON.parse(result.text);
          probe.name.should.equal(probeProp.name);
          probe.protocol.should.equal(probeProp.newProtocol);
          probe.port.should.equal(probeProp.newPort);
          probe.intervalInSeconds.should.equal(probeProp.newIntervalInSeconds);
          probe.numberOfProbes.should.equal(probeProp.newNumberOfProbes);
          networkUtil.shouldBeSucceeded(probe);
          done();
        });
      });
      it('list should display all probes in load balancer', function (done) {
        var cmd = 'network lb probe list -g {group} -l {lbName} --json'.formatArgs(probeProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var probes = JSON.parse(result.text);
          _.some(probes, function (probe) {
            return probe.name === probeProp.name;
          }).should.be.true;
          done();
        });
      });
      it('delete should delete probe', function (done) {
        var cmd = 'network lb probe delete -g {group} -l {lbName} -n {name} --quiet --json'.formatArgs(probeProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = 'network lb probe list -g {group} -l {lbName} --json'.formatArgs(probeProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var probes = JSON.parse(result.text);
            _.some(probes, function (probe) {
              return probe.name === probeProp.name;
            }).should.be.false;
            done();
          });
        });
      });
    });
  });
});