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
var testPrefix = 'cli.vm.create_docker-tests';
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
      dockerCertDir,
      //dockerCerts,sshKeys,
      SSHKeyDir, SSHKeyFolder = '.azure/ssh',
      location, retry = 5,
      homePath, timeout,
      username = 'azureuser',
      password = 'Pa$$word@123',
      ripName = 'clitestrip',
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
      suite.setupTest(function() {
        vmName = suite.generateId(vmPrefix, createdVMs);
        done();
      });
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
        testUtils.deleteDockerCertificates(dockerCertDir);
        testUtils.deleteSSHKeys(SSHKeyDir);
      });
    });

    describe('Vm Create: ', function() {
      it('Create Docker VM with default values and reserved Ip should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 2376;

        vmUtil.getImageName('Linux', suite, function(ImageName) {
          vmUtil.createReservedIp(null, location, suite, function(ripName) {
            var cmd = util.format('vm docker create %s %s %s %s -R %s --json --ssh',
              vmName, ImageName, username, password, ripName).split(' ');
            cmd.push('--location');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm show %s --json', vmName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var certificatesExist = testUtils.checkForDockerCertificates(vmName, dockerCertDir);
                certificatesExist.should.be.true;
                var createdVM = JSON.parse(result.text);
                var dockerPortExists = vmUtil.checkForDockerPort(createdVM, dockerPort);
                dockerPortExists.should.be.true;
                createdVM.VMName.should.equal(vmName);
                vmToUse.Name = vmName;
                vmToUse.Created = true;
                vmToUse.Delete = true;
                setTimeout(done, timeout);
              });
            });
          });
        });
      });

      it('Create Docker VM with custom values should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 4113;

        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s %s --json --ssh --docker-cert-dir %s --docker-port %s',
            vmName, ImageName, username, password, dockerCertDir, dockerPort).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var certificatesExist = testUtils.checkForDockerCertificates(vmName, dockerCertDir);
              certificatesExist.should.be.true;
              var createdVM = JSON.parse(result.text);
              var dockerPortExists = vmUtil.checkForDockerPort(createdVM, dockerPort);
              dockerPortExists.should.be.true;
              createdVM.VMName.should.equal(vmName);
              vmToUse.Name = vmName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('Create Docker VM with ssh cert, no ssh endpoint and no ssh password should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 2376;

        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s --ssh-cert %s --no-ssh-password --no-ssh-endpoint --json',
            vmName, ImageName, username, certFile).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var certificatesExist = testUtils.checkForDockerCertificates(vmName, dockerCertDir);
              certificatesExist.should.be.true;
              var createdVM = JSON.parse(result.text);
              var dockerPortExists = vmUtil.checkForDockerPort(createdVM, dockerPort);
              dockerPortExists.should.be.true;
              createdVM.VMName.should.equal(vmName);
              vmToUse.Name = vmName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('Create Docker VM with generate ssh keys option should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 2376,
          SSHKeyFolder = '.azure/ssh';
        SSHKeyDir = path.join(homePath, SSHKeyFolder);
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s --ssh --generate-ssh-keys --json',
            vmName, ImageName, username, password).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var certificatesExist = testUtils.checkForDockerCertificates(vmName, dockerCertDir);
              certificatesExist.should.be.true;
              var createdVM = JSON.parse(result.text);
              var dockerPortExists = vmUtil.checkForDockerPort(createdVM, dockerPort);
              dockerPortExists.should.be.true;
              var SSHkeysExist = testUtils.checkForSSHKeys(vmName, SSHKeyDir);
              SSHkeysExist.should.be.true;
              createdVM.VMName.should.equal(vmName);
              vmToUse.Name = vmName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('Create Docker VM with ssh cert and no ssh password, but no ssh endpoint or explicit disabled ssh endpoint should throw error', function(done) {
        dockerCertDir = null;
        SSHKeyDir = null;
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s --ssh-cert %s --no-ssh-password --json',
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


      it('Create Docker VM with duplicate docker port should throw error', function(done) {
        dockerCertDir = null;
        SSHKeyDir = null;
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s %s --json --ssh 22 --docker-port 22',
            vmName, ImageName, username, password).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.not.equal(0);
            result.errorText.should.include('Port 22 is already in use by one of the endpoints in this deployment');
            setTimeout(done, timeout);
          });
        });
      });

      it('Create Docker VM with invalid docker port should throw error', function(done) {
        dockerCertDir = null;
        SSHKeyDir = null;
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s %s --json --ssh 22 --docker-port 3.2',
            vmName, ImageName, username, password).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.not.equal(0);
            result.errorText.should.include('A parameter was incorrect');
            setTimeout(done, timeout);
          });
        });
      });

      it('Create Docker VM with invalid docker cert dir should throw error', function(done) {
        dockerCertDir = null;
        SSHKeyDir = null;
        vmUtil.getImageName('Linux', suite, function(ImageName) {
          var randomPath = __dirname + "/hello/test";
          var cmd = util.format('vm docker create %s %s %s %s --json --ssh 22 --docker-cert-dir %s',
            vmName, ImageName, username, password, randomPath).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.not.equal(0);
            result.errorText.should.include('ENOENT');
            setTimeout(done, timeout);
          });
        });
      });
    });

  });
});