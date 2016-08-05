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
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'clitestvm';
var createdVMs = [];
var testPrefix = 'cli.vm.create_ssh-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      SSHKeyDir, SSHKeyFolder = '.azure/ssh',
      location, retry = 5,
      homePath, timeout,
      username = 'azureuser',
      password = 'Pa$$word@123',
      certFile;
    testUtils.TIMEOUT_INTERVAL = 12000;
    var vmUtil = new vmTestUtil();

    // A common VM used by multiple tests
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        certFile = process.env.SSHCERT;
        done()
      });
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = suite.generateId(vmPrefix, createdVMs);
        done();
      });
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
        testUtils.deleteSSHKeys(SSHKeyDir);
      });
    });

    describe('Vm Create: ', function() {
      it('Create VM with ssh cert, no ssh endpoint and no ssh password should pass', function(done) {
        SSHKeyDir = null;
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm create %s %s %s --ssh-cert %s --no-ssh-password --no-ssh-endpoint --json',
            vmName, ImageName, username, certFile).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              result.text.should.containEql('ConsoleScreenshotBlobUri');
              result.text.should.containEql('SerialOutputBlobUri');
              result.text.should.containEql('"BootDiagnosticsEnabled": true');
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

      it('Create VM with generate ssh keys option should pass', function(done) {
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          SSHKeyDir = path.join(homePath, SSHKeyFolder);
          var cmd = util.format('vm create %s %s %s %s --ssh --generate-ssh-keys --disable-boot-diagnostics --json',
            vmName, ImageName, username, password).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              result.text.should.containEql('"BootDiagnosticsEnabled": {}');
              var createdVM = JSON.parse(result.text);
              createdVM.VMName.should.equal(vmName);
              var SSHkeysExist = testUtils.checkForSSHKeys(vmName, SSHKeyDir);
              SSHkeysExist.should.be.true;
              vmToUse.Name = vmName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('Create VM with ssh cert and no ssh password, but no ssh endpoint or explicit disabled ssh endpoint should throw error', function(done) {
        SSHKeyDir = null;
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm create %s %s %s --ssh-cert %s --no-ssh-password --json',
            vmName, ImageName, username, certFile).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.not.equal(0);
            result.errorText.should.include('--no-ssh-password, --ssh-cert and --generate-ssh-keys can only be used with --ssh or --no-ssh-endpoint parameter');
            setTimeout(done, timeout);
          });
        });
      });
    });
  });
});