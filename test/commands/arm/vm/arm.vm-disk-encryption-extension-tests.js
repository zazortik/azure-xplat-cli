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
var profile = require('../../../../lib/util/profile');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-disk-encryption-extension-tests';
var groupPrefix = 'xplatTestADE';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'westus'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
  vmPrefix = 'xplattestvm',
  nicName = 'xplattestnic',
  vaultName = 'xplattestkv',
  aadAppName = 'xplattestapp',
  aadClientSecret = 'xPL4t',
  aadClientId,
  identifierUri,
  aadObjectId,
  spn,
  spObjectId,
  location,
  username = 'azureuser',
  password = 'AzDE@2016',
  storageAccount = 'xplatteststorage1',
  storageCont = 'xplatteststoragecnt1',
  vNetPrefix = 'xplattestvnet',
  subnetName = 'xplattestsubnet',
  publicipName = 'xplattestip',
  dnsPrefix = 'xplattestipdns',
  subscriptionId,
  diskEncryptionKeyVaultId,
  diskEncryptionKeySecretUrl,
  sshcert,
  winImageUrn = 'MicrosoftWindowsServer:WindowsServer:2012-R2-Datacenter:latest';

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      this.timeout(vmTest.timeoutLarge);
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT;
        groupName = suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        vaultName = suite.isMocked ? vaultName : suite.generateId(vaultName, null);
        aadAppName = suite.isMocked ? aadAppName : suite.generateId(aadAppName, null);
        identifierUri = util.format('http://localhost:8080/%s', aadAppName);
        aadClientSecret = suite.isMocked ? aadClientSecret : suite.generateId(aadClientSecret, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.generateId(storageCont, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.generateId(dnsPrefix, null);
        subscriptionId = profile.current.getSubscription().id;
        if (!suite.isPlayback()) {
          setupPrerequisites(done);
        } else {
          done();
        }
      });
    });

    after(function(done) {
      suite.teardownSuite(function () {
        if (!suite.isPlayback()) {
          cleanupCreatedArtifacts(done);
        } else {
          done();
        }
      });
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    function setupPrerequisites(done)
    {
      // Create a resource group
      suite.execute('group create -n %s -l %s --json', groupName, location, function (result) {
        result.exitStatus.should.equal(0);
        // Create a Windows VM
        suite.execute('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s --json', groupName, vmPrefix, location, nicName, winImageUrn, username, password, storageAccount, storageCont, vNetPrefix, '10.4.0.0/16', subnetName, '10.4.0.0/24', publicipName, dnsPrefix, function (result) {
          result.exitStatus.should.equal(0);
          // Create an AAD app
          suite.execute('ad app create -n %s --home-page "http://www.contoso.com" -i %s -p %s --json', aadAppName, identifierUri, aadClientSecret, function (result) {
            result.exitStatus.should.equal(0);
            var appResources = JSON.parse(result.text);
            aadClientId = appResources.appId;
            aadObjectId = appResources.objectId;
            // Create a service principal
            suite.execute('ad sp create --applicationId %s --json', aadClientId, function (result) {
              result.exitStatus.should.equal(0);
              var spResources = JSON.parse(result.text);
              spn = spResources.appId;
              spObjectId = spResources.objectId;
              // Create a KeyVault
              suite.execute('keyvault create %s --resource-group %s --location %s --json', vaultName, groupName, location, function (result) {
                result.exitStatus.should.equal(0);
                var kvResources = JSON.parse(result.text);
                diskEncryptionKeyVaultId = kvResources.id;
                diskEncryptionKeySecretUrl = kvResources.properties.vaultUri;
                // Prepare the vault for encryption
                suite.execute('keyvault set-policy -u %s --spn %s --perms-to-keys ["all"] --perms-to-secrets ["all"] --enabled-for-disk-encryption true --json', vaultName, spn, function (result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
    }

    function cleanupCreatedArtifacts(done)
    {
      suite.execute('ad app delete --objectId %s --quiet --json', aadObjectId, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('keyvault delete -u %s --quiet --json', vaultName, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('group delete -n %s --quiet --json', groupName, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    }

    describe('vm', function() {
      it('should show the correct encryption status for the new Windows VM - not encrypted', function(done) {
        var cmd = util.format('vm show-disk-encryption-status %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.osVolumeEncrypted.should.equal('NotEncrypted');
          allResources.dataVolumesEncrypted.should.equal('NotEncrypted');
          done();
        });
      });

      it('should enable encryption on the Windows VM', function(done) {
        var cmd = util.format('vm enable-disk-encryption -g %s -n %s -a %s -p %s -k %s -r %s --quiet --json', groupName, vmPrefix, spn, aadClientSecret, diskEncryptionKeySecretUrl, diskEncryptionKeyVaultId).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('should show the correct encryption status for the VM - encrypted', function(done) {
        var cmd = util.format('vm show-disk-encryption-status %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.osVolumeEncrypted.should.equal('Encrypted');
          allResources.dataVolumesEncrypted.should.equal('Encrypted');
          done();
        });
      });

      it('should disable encryption on the Windows VM', function(done) {
        var cmd = util.format('vm disable-disk-encryption -g %s -n %s --quiet --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('should show the correct encryption status for the VM - not encrypted', function(done) {
        var cmd = util.format('vm show-disk-encryption-status %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.osVolumeEncrypted.should.equal('NotEncrypted');
          allResources.dataVolumesEncrypted.should.equal('NotEncrypted');
          done();
        });
      });

    });
  });
});