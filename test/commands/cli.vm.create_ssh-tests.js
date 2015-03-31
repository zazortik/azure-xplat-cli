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
var path = require('path');
var fs = require('fs');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'clitestvm';
var createdVMs = [];
var testPrefix = 'cli.vm.create_ssh-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: null
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location, retry = 5,
      homePath, timeout,
      username = 'azureuser',
      certFile;
    testUtils.TIMEOUT_INTERVAL = 12000;

    // A common VM used by multiple tests
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        vmName = suite.generateId(vmPrefix, createdVMs);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        certFile = process.env.SSHCERT;
        done();
      });
    });

    afterEach(function(done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          setTimeout(function() {
            var cmd = util.format('vm delete %s -b --quiet --json', vm.Name).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              vm.Name = null;
              vm.Created = vm.Delete = false;
              return callback();
            });
          }, timeout);
        } else {
          return callback();
        }
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownTest(done);
      });
    });

    describe('Vm Create: ', function() {
      it('Create VM with ssh cert, no ssh endpoint and no ssh password should pass', function(done) {
        getImageName('Linux', function(ImageName) {
          var cmd = util.format('vm create %s %s %s --ssh-cert %s --no-ssh-password --no-ssh-endpoint --json',
            vmName, ImageName, username, certFile).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var createdVM = JSON.parse(result.text);
              createdVM.VMName.should.equal(vmName);
              vmToUse.Name = vmName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
        });
      });
      
      it('Create VM with ssh cert and no ssh password, but no ssh endpoint or explicit disabled ssh endpoint should throw error', function(done) {
        getImageName('Linux', function(ImageName) {
          var cmd = util.format('vm create %s %s %s --ssh-cert %s --no-ssh-password --json',
            vmName, ImageName, username, certFile).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.not.equal(0);
            result.errorText.should.include('--no-ssh-password and --ssh-cert can only be used with --ssh or --no-ssh-endpoint parameter');
            setTimeout(done, timeout);
          });
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (process.env.VM_LINUX_IMAGE) {
        callBack(process.env.VM_LINUX_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function(image) {
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_LINUX_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_LINUX_IMAGE);
        });
      }
    }
  });
});