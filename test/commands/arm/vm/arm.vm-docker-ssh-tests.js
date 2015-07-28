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
var testprefix = 'arm-cli-vm-docker-generate-sshkeys-tests';
var path = require('path');
var fs = require('fs');
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

var groupName = 'xplatTestGVMDockerSSH',
  vmPrefix = 'xplatvmdockssh',
  nicName = 'xplatnicdockssh',
  location, homePath, timeout,
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplatstdockssh',
  storageCont = 'xplatscntdockssh',
  osdiskvhd = 'xplatdocksshvhd',
  vNetPrefix = 'xplatdocksshvnet',
  subnetName = 'xplatdocksshsubnet',
  publicipName = 'xplatdocksship',
  dnsPrefix = 'xplatdocksshipdns';

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5,
      dockerCertDir, dockerCertFol = '.docker',
      SSHKeyDir, SSHKeyFolder = '.azure/ssh';
    var vmTest = new VMTestUtil();
    testUtils.TIMEOUT_INTERVAL = 12000;
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.generateId(storageCont, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.isMocked ? dnsPrefix : suite.generateId(dnsPrefix, null);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        done();
      });
    });
    after(function(done) {
      vmTest.deleteUsedGroup(groupName, suite, function(result) {
        vmTest.deleteDockerCertificates(dockerCertDir);
        vmTest.deleteSSHKeys(SSHKeyDir);
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
      it('docker create with generate ssh keys option should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.createGroup(groupName, location, suite, function(result) {
          vmTest.GetDockerLinuxImageList(location, suite, function(result) {
            dockerCertDir = path.join(homePath, dockerCertFol);
            SSHKeyDir = path.join(homePath, SSHKeyFolder);
            var cmd = util.format('vm docker create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -G --json',
              groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
              vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var certifiatesExist = vmTest.checkForDockerCertificates(vmPrefix, dockerCertDir);
              certifiatesExist.should.be.true;
              var SSHkeysExist = vmTest.checkForSSHKeys(vmPrefix, SSHKeyDir);
              SSHkeysExist.should.be.true;
              done();
            });
          });

        });
      });

      it('show should display created Docker VM', function(done) {
        var cmd = util.format('vm show %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});