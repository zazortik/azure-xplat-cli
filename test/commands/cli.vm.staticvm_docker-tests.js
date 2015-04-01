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

var suite, vmPrefix;
var vmPrefix = 'clitestvm';
var createdVms = [];
var createdVnets = [];
var testPrefix = 'cli.vm.staticvm_docker-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      dockerCertDir,
      dockerCerts, timeout,
      location, retry = 5,
      username = 'azureuser',
      password = 'Pa$$word@123',
      homePath;
    testUtils.TIMEOUT_INTERVAL = 12000;

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
      homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    });

    after(function(done) {
      suite.teardownSuite(function (){
        if(!suite.isPlayback()) {
          createdVnets.forEach(function (item) {
            suite.execute('network vnet delete %s -q --json', item, function (result) {
              result.exitStatus.should.equal(0);
            });
          });
        }
        done();
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        vmName = suite.generateId(vmPrefix, null);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
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
      it('Create Docker VM with staticip should pass', function(done) {
        dockerCertDir = path.join(homePath, '.docker');
        var dockerPort = 4243;

        getImageName('Linux', function(ImageName) {
          getVnet('Created', function(virtualnetName, affinityName, staticIpToCreate, staticIpToSet) {
            var cmd = util.format('vm docker create %s %s %s %s -a %s --static-ip %s --virtual-network-name %s --json',
              vmName, ImageName, username, password, affinityName, staticIpToSet, virtualnetName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm show %s --json', vmName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var certifiatesExist = checkForDockerCertificates(dockerCertDir);
                certifiatesExist.should.be.true;
                var cratedVM = JSON.parse(result.text);
                var dockerPortExists = checkForDockerPort(cratedVM, dockerPort);
                dockerPortExists.should.be.true;

                cratedVM.VMName.should.equal(vmName);
                vmToUse.Name = vmName;
                vmToUse.Created = true;
                vmToUse.Delete = true;
                setTimeout(done, timeout);
              });
            });
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

    function getVnet(status, callback) {
      var cmd;
      if (getVnet.vnetName) {
        callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
      } else {
        cmd = util.format('network vnet list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vnetName = JSON.parse(result.text);
          var found = vnetName.some(function(vnet) {
            if (vnet.state === status && vnet.affinityGroup !== undefined) {
              getVnet.vnetName = vnet.name;
              getVnet.affinityName = vnet.affinityGroup;
              var address = vnet.addressSpace.addressPrefixes[0];
              var addressSplit = address.split('/');
              var staticIpToCreate = addressSplit[0];
              var n = staticIpToCreate.substring(0, staticIpToCreate.lastIndexOf('.') + 1);
              var staticIpToSet = n.concat(addressSplit[1]);
              getVnet.staticIpToCreate = staticIpToCreate;
              getVnet.staticIpToSet = staticIpToSet;
              return true;
            }
          });

          if (!found) {
            getAffinityGroup(location, function(affinGrpName) {
              vnetName = suite.generateId('testvnet', createdVnets);
              cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                getVnet.vnetName = vnetName;
                getVnet.affinityName = affinGrpName;
                var address = vnet.addressSpace.addressPrefixes[0];
                var addressSplit = address.split('/');
                var staticIpToCreate = addressSplit[0];
                var n = staticIpToCreate.substring(0, staticIpToCreate.lastIndexOf('.') + 1);
                var staticIpToSet = n.concat(addressSplit[1]);
                getVnet.staticIpToCreate = staticIpToCreate;
                getVnet.staticIpToSet = staticIpToSet;
                callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
              });
            });
          } else {
            callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
          }
        });
      }
    }

    function checkForDockerPort(cratedVM, dockerPort) {
      var result = false;
      if (cratedVM.Network && cratedVM.Network.Endpoints) {
        cratedVM.Network.Endpoints.forEach(function(element, index, array) {
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