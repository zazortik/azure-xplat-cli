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
var testPrefix = 'cli.vm.create_docker-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      dockerCertDir,
      dockerCerts,
      location, retry = 5,
      homePath, timeout,
      username = 'azureuser',
      password = 'Pa$$word@123',
      ripName = 'clitestrip',
      ripCreate = false;
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
      if (ripCreate) {
        deleterip(function() {
          suite.teardownSuite(done);
        });
      } else {
        suite.teardownSuite(done);
      }
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        vmName = suite.generateId(vmPrefix, createdVMs);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
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

      function deleteDockerCertificates() {
        if (!dockerCertDir || !dockerCerts) {
          return;
        }

        fs.exists(dockerCertDir, function(exists) {
          if (!exists) {
            return;
          }

          fs.unlinkSync(dockerCerts.caKey);
          fs.unlinkSync(dockerCerts.ca);
          fs.unlinkSync(dockerCerts.serverKey);
          fs.unlinkSync(dockerCerts.server);
          fs.unlinkSync(dockerCerts.serverCert);
          fs.unlinkSync(dockerCerts.clientKey);
          fs.unlinkSync(dockerCerts.client);
          fs.unlinkSync(dockerCerts.clientCert);
          fs.unlinkSync(dockerCerts.extfile);
          fs.rmdirSync(dockerCertDir);
        });
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownTest(done);
        deleteDockerCertificates();
      });
    });

    describe('Vm Create: ', function() {
      it('Create Docker VM with default values and reserved Ip should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 4243;

        getImageName('Linux', function(ImageName) {
          createReservedIp(location, function(ripName) {
            var cmd = util.format('vm docker create %s %s %s %s -R %s --json --ssh',
              vmName, ImageName, username, password, ripName).split(' ');
            cmd.push('--location');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm show %s --json', vmName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var certificatesExist = checkForDockerCertificates(dockerCertDir);
                certificatesExist.should.be.true;
                var createdVM = JSON.parse(result.text);
                var dockerPortExists = checkForDockerPort(createdVM, dockerPort);
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

        getImageName('Linux', function(ImageName) {
          var cmd = util.format('vm docker create %s %s %s %s --json --ssh --docker-cert-dir %s --docker-port %s',
            vmName, ImageName, username, password, dockerCertDir, dockerPort).split(' ');
          cmd.push('--location');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var certificatesExist = checkForDockerCertificates(dockerCertDir);
              certificatesExist.should.be.true;
              var createdVM = JSON.parse(result.text);
              var dockerPortExists = checkForDockerPort(createdVM, dockerPort);
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

      it('Create Docker VM with duplicate docker port should throw error', function(done) {
        getImageName('Linux', function(ImageName) {
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
        getImageName('Linux', function(ImageName) {
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
        getImageName('Linux', function(ImageName) {
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

    function checkForDockerPort(createdVM, dockerPort) {
      var result = false;
      if (createdVM.Network && createdVM.Network.Endpoints) {
        createdVM.Network.Endpoints.forEach(function(element, index, array) {
          if (element.name === 'docker' && element.port === dockerPort) {
            result = true;
          }
        });
      }
      return result;
    }

    function checkForDockerCertificates(dockerCertDir, cb) {
      dockerCerts = {
        caKey: path.join(dockerCertDir, 'ca-key.pem'),
        ca: path.join(dockerCertDir, 'ca.pem'),
        serverKey: path.join(dockerCertDir, 'server-key.pem'),
        server: path.join(dockerCertDir, 'server.csr'),
        serverCert: path.join(dockerCertDir, 'server-cert.pem'),
        clientKey: path.join(dockerCertDir, 'key.pem'),
        client: path.join(dockerCertDir, 'client.csr'),
        clientCert: path.join(dockerCertDir, 'cert.pem'),
        extfile: path.join(dockerCertDir, 'extfile.cnf')
      };

      if (!fs.existsSync(dockerCerts.caKey)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.ca)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.serverKey)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.server)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.serverCert)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.clientKey)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.client)) {
        return false;
      }

      if (!fs.existsSync(dockerCerts.clientCert)) {
        return false;
      }

      return true;
    }

    function createReservedIp(location, callback) {
      if (createReservedIp.ripName) {
        callback(createReservedIp.ripName);
      } else {
        var cmd;
        cmd = util.format('network reserved-ip list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var ripList = JSON.parse(result.text);
          var ripfound = ripList.some(function(ripObj) {
            if (!ripObj.inUse && ripObj.location.toLowerCase() === location.toLowerCase()) {
              createReservedIp.ripName = ripObj.name;
              return true;
            }
          });
          if (ripfound) {
            callback(createReservedIp.ripName);
          } else {
            cmd = util.format('network reserved-ip create %s %s --json', ripName, location).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              ripCreate = true;
              createReservedIp.ripName = ripObj.name;
              callback(createReservedIp.ripName);
            });
          }
        });
      }
    }

    function deleterip(callback) {
      var cmd = util.format('network reserved-ip delete %s -q --json', ripName).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        ripCreate = false;
        callback();
      });
    }
  });
});