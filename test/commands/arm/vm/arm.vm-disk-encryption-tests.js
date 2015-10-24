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
var testprefix = 'arm-cli-vm-disk-encryption-tests';
var groupPrefix = 'xplatTestDiskEncrypt';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
  vmPrefix = 'xplattestvm',
  nicName = 'xplattestnic',
  location,
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplatteststorage1',
  storageCont = 'xplatteststoragecnt1',
  osdiskvhd = 'xplattestvhd',
  vNetPrefix = 'xplattestvnet',
  subnetName = 'xplattestsubnet',
  publicipName = 'xplattestip',
  dnsPrefix = 'xplattestipdns',
  diskEncryptionKeyVaultId = '/subscriptions/e33f361b-53c2-4cc7-b829-78906708387b/resourceGroups/RgTest1/providers/Microsoft.KeyVault/vaults/TestVault123',
  diskEncryptionKeySecretUrl = 'https://testvault123.vault.azure.net/secrets/Test1/514ceb769c984379a7e0230bddaaaaaa',
  keyEncryptionKeyVaultId = '/subscriptions/e33f361b-53c2-4cc7-b829-78906708387b/resourceGroups/RgTest1/providers/Microsoft.KeyVault/vaults/TestVault123',
  keyEncryptionKeyUrl = 'https://testvault123.vault.azure.net/key/Test1/514ceb769c984379a7e0230bddaaaaaa',
  vmSize = 'Standard_A1',
  stoType = 'GRS',
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
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.generateId(storageCont, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.generateId(dnsPrefix, null);
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
      it('create disk encryption vm should fail', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.createGroup(groupName, location, suite, function(result) {
          var cmd = util.format(
            'storage account create %s --resource-group %s --type %s --location %s --json',
            storageAccount, groupName, stoType, location).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var vhdUrl = 'https://' + storageAccount + '.blob.core.windows.net/test/test1.vhd';
              var cmd = util.format(
                'vm create %s %s %s Linux -f %s -d %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s ' +
                ' -z %s --encryption-key-vault-id %s --encryption-key-secret-url %s --encryption-master-key-vault-id %s --encryption-master-key-url %s --json',
                groupName, vmPrefix, location, nicName, vhdUrl, username, password, storageAccount, storageCont,
                vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert,
                vmSize, diskEncryptionKeyVaultId, diskEncryptionKeySecretUrl, keyEncryptionKeyVaultId, keyEncryptionKeyUrl).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.not.equal(0);
              should(result.errorText.indexOf('EncryptionSettings') > -1).ok;
              done();
            });
          });
        });
      });
    });
  });
});