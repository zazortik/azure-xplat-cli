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
var testprefix = 'arm-cli-vm-quickcreate-tests';
var groupPrefix = 'xplatTestGVMQuick';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
  vmPrefix = 'xplatvmquick',
  location,
  username = 'azureuser',
  password = 'Brillio@2015',
  sshcert;

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;

    var vmTest = new VMTestUtil();

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        done();
      });
    });
    after(function(done) {
      vmTest.deleteUsedGroup(groupName, suite, function(result) {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('vm', function() {
      it('Quick create should create a VM', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            if (VMTestUtil.linuxImageUrn === '' || VMTestUtil.linuxImageUrn === undefined) {
              vmTest.GetLinuxSkusList(location, suite, function(result) {
                vmTest.GetLinuxImageList(location, suite, function(result) {
                  var cmd = util.format('vm quick-create %s %s %s Linux %s %s %s --json',
                    groupName, vmPrefix, location, VMTestUtil.linuxImageUrn, username, password).split(' ');

                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            } else {
              var cmd = util.format('vm quick-create %s %s %s Linux %s %s %s --json',
                groupName, vmPrefix, location, VMTestUtil.linuxImageUrn, username, password).split(' ');

              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            }
          });
        });
      });

      it('list should work', function(done) {
        var cmd = util.format('vm list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function(res) {
            return res.name === vmPrefix;
          }).should.be.true;
          done();
        });
      });
    });

  });
});