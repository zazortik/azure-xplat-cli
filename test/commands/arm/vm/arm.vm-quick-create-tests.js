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
var path = require('path');
var fs = require('fs');
var util = require('util');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-quick-create-tests';
var groupPrefix = 'xplatTestVMQCreate';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
  vm1Prefix = 'xplatvm101',
  vm2Prefix = 'xplatvm102',
  location,
  username = 'azureuser',
  password = 'Brillio@2016',
  sshcert;

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT;
        groupName = suite.generateId(groupPrefix, null);
        vm1Prefix = suite.isMocked ? vm1Prefix : suite.generateId(vm1Prefix, null);
        vm2Prefix = suite.isMocked ? vm2Prefix : suite.generateId(vm2Prefix, null);
        done();
      });
    });

    after(function(done) {
      this.timeout(vmTest.timeoutLarge * 10);
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

      it('quick create with non-existing group should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        vmTest.checkImagefile(function() {
          if (VMTestUtil.linuxImageUrn === '' || VMTestUtil.linuxImageUrn === undefined) {
            vmTest.GetLinuxSkusList(location, suite, function(result) {
              vmTest.GetLinuxImageList(location, suite, function(result) {
                var latestLinuxImageUrn = VMTestUtil.linuxImageUrn.substring(0, VMTestUtil.linuxImageUrn.lastIndexOf(':')) + ':latest';
                var cmd = util.format('vm quick-create %s %s %s Linux %s %s %s -M %s -z Standard_D1',
                  groupName, vm1Prefix, location, latestLinuxImageUrn, username, password, sshcert).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  result.text.should.containEql('-pip.' + location.toLowerCase() + '.cloudapp.azure.com');
                  done();
                });
              });
            });
          }
          else {
            var latestLinuxImageUrn = VMTestUtil.linuxImageUrn.substring(0, VMTestUtil.linuxImageUrn.lastIndexOf(':')) + ':latest';
            var cmd = util.format('vm quick-create %s %s %s Linux %s %s %s -M %s -z Standard_D1',
              groupName, vm1Prefix, location, latestLinuxImageUrn, username, password, sshcert).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              result.text.should.containEql('-pip.' + location.toLowerCase() + '.cloudapp.azure.com');
              done();
            });
          }
        });
      });

      it('quick create with existing group should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        vmTest.checkImagefile(function() {
          var latestWindowsImageUrn = '';
          if (VMTestUtil.winImageUrn === '' || VMTestUtil.winImageUrn === undefined) {
            vmTest.GetWindowsSkusList(location, suite, function(result) {
              vmTest.GetWindowsImageList(location, suite, function(result) {
                vmTest.setGroup(groupName, suite, function(result) {
                  var latestWindowsImageUrn = VMTestUtil.winImageUrn.substring(0, VMTestUtil.winImageUrn.lastIndexOf(':')) + ':latest';
                  var cmd = util.format('vm quick-create %s %s %s Windows %s %s %s',
                  groupName, vm2Prefix, location, latestWindowsImageUrn, username, password).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    result.text.should.containEql('-pip.' + location.toLowerCase() + '.cloudapp.azure.com');
                    done();
                  });
                });
              });
            });
          }
          else {
            vmTest.setGroup(groupName, suite, function(result) {
              var latestWindowsImageUrn = VMTestUtil.winImageUrn.substring(0, VMTestUtil.winImageUrn.lastIndexOf(':')) + ':latest';
              var cmd = util.format('vm quick-create %s %s %s Windows %s %s %s',
                groupName, vm2Prefix, location, latestWindowsImageUrn, username, password).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                result.text.should.containEql('-pip.' + location.toLowerCase() + '.cloudapp.azure.com');
                done();
              });
            });
          }
        });
      });

    });
  });
});