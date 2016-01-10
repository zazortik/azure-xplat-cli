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
var should = require('should');
var util = require('util');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');
var suite;
var vmPrefix = 'ClitestVm';
var createdVms = [];
var testPrefix = 'cli.vm.create_win_rdp-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      username = 'azureuser',
      password = 'PassW0rd$',
      location, retry = 5,
      ripName = 'clitestrip',
      ripCreate = false;
    testUtils.TIMEOUT_INTERVAL = 30000;
    var vmUtil = new vmTestUtil();
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
        ripName = suite.generateId(ripName, createdVms);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    after(function(done) {
      if (vmUtil.ripCreate) {
        vmUtil.deleterip(ripName, suite, function() {
          suite.teardownSuite(done);
        });
      } else {
        suite.teardownSuite(done);
      }
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
      });
    });

    //create a vm with windows image
    describe('Create:', function() {
      it('Windows Vm with reserved Ip', function(done) {
        vmUtil.getImageName('Windows', suite, function(ImageName) {
          vmUtil.createReservedIp(ripName, location, suite, function(ripName) {
            var cmd = util.format('vm create %s %s %s %s -R %s -r --json',
              vmName, ImageName, username, password, ripName).split(' ');
            cmd.push('-l');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(done, timeout);
            });
          });
        });
      });
    });

    //create a vm with connect option
    describe('Create:', function() {
      it('with Connect', function(done) {
        vmUtil.getImageName('Windows', suite, function(vmImgName) {
          var vmConnect = vmName + '-2';
          var cmd = util.format('vm create -l %s --connect %s %s %s %s --json',
            'someLoc', vmName, vmImgName, username, password).split(' ');
          cmd[3] = location;
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            vmToUse.Name = vmConnect;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            done();
          });
        });
      });
    });

    // Negative Test Case by specifying VM Name Twice
    describe('Negative test case:', function() {
      it('Specifying Vm Name Twice', function(done) {
        vmUtil.getImageName('Windows', suite, function(vmImgName) {
          var cmd = util.format('vm create %s %s %s %s --json',
            vmName, vmImgName, username, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('A VM with dns prefix "' + vmName + '" already exists');
            vmToUse.Name = vmName;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            done();
          });
        });
      });
    });
  });
});
