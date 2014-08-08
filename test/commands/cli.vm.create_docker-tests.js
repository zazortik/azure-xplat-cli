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
var sinon = require('sinon');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;
var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');
var timeout = isForceMocked ? 0 : 12000;
var homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];

var suite;
var testPrefix = 'cli.vm.create_docker-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      dockerCertDir,
      dockerCerts,
      location;

    // A common VM used by multiple tests
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function() {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }
      suite.setupSuite(done);
    });

    after(function(done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        vmName = process.env.TEST_VM_NAME;
        done();
      });
    });

    afterEach(function(done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          setTimeout(function() {
            suite.execute('vm delete %s -b --quiet --json', vm.Name, function(result) {
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
      it('Create Docker VM with default values should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 4243;

        getImageName('Linux', function(ImageName) {
          suite.execute('vm docker create %s %s "azureuser" "Pa$$word@123" --json --location %s --ssh',
            vmName, ImageName, location, function(result) {
              result.exitStatus.should.equal(0);
              suite.execute('vm show %s --json', vmName, function(result) {
                result.exitStatus.should.equal(0);
                var certifiatesExist = checkForDockerCertificates(dockerCertDir);
                certifiatesExist.should.be.true;
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

      it('Create Docker VM with custom values should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker2');
        var dockerPort = 4113;

        getImageName('Linux', function(ImageName) {
          suite.execute('vm docker create %s %s "azureuser" "Pa$$word@123" --json --location %s --ssh --docker-cert-dir %s --docker-port %s',
            vmName, ImageName, location, dockerCertDir, dockerPort, function(result) {
              result.exitStatus.should.equal(0);
              suite.execute('vm show %s --json', vmName, function(result) {
                result.exitStatus.should.equal(0);
                var certificatesExist = checkForDockerCertificates(dockerCertDir.toString());
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
          suite.execute('vm docker create %s %s "azureuser" "Pa$$word@123" --json --location %s --ssh 22 --docker-port 22',
            vmName, ImageName, location, function(result) {
              result.exitStatus.should.not.equal(0);
              setTimeout(done, timeout);
            });
        });
      });

      it('Create Docker VM with invalid docker port should throw error', function(done) {
        getImageName('Linux', function(ImageName) {
          suite.execute('vm docker create %s %s "azureuser" "Pa$$word@123" --json --location %s --ssh 22 --docker-port 3.2',
            vmName, ImageName, location, function(result) {
              result.exitStatus.should.not.equal(0);
              result.errorText.should.include('A parameter was incorrect');
              setTimeout(done, timeout);
            });
        });
      });

      it('Create Docker VM with invalid docker cert dir should throw error', function(done) {
        getImageName('Linux', function(ImageName) {
          suite.execute('vm docker create %s %s "azureuser" "Pa$$word@123" --json --location %s --ssh 22 --docker-cert-dir D:/foo/bar',
            vmName, ImageName, location, function(result) {
              result.exitStatus.should.not.equal(0);
              result.errorText.should.include('ENOENT');
              setTimeout(done, timeout);
            });
        });
      });

    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      var imageName;
      suite.execute('vm image list --json', function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);
        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            imageName = image.name;
            return true;
          }
        });

        callBack(imageName);
      });
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

  });
});