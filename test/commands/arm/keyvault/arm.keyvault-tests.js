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
var util = require('util');
var fs = require('fs')

var CLITest = require('../../../framework/arm-cli-test');
var log = require('../../../framework/test-logger');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testPrefix = 'arm-cli-keyvault-tests';
var rgPrefix = 'xplatTestRg';
var vaultPrefix = 'xplatTestVault';
var knownNames = [];

var requiredEnvironment = [
  { requiresToken: true }, 
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' } 
];

var galleryTemplateName;
var galleryTemplateUrl;

describe('arm', function() {

  describe('keyvault', function() {
    
    var suite;
    var dnsUpdateWait;
    var testLocation;
    var testResourceGroup;

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() { 
        dnsUpdateWait = suite.isPlayback() ? 0 : 5000;
        testLocation = process.env.AZURE_ARM_TEST_LOCATION;
        testLocation = testLocation.toLowerCase().replace(/ /g, '');
        testResourceGroup = suite.generateId(rgPrefix, knownNames);
        suite.execute('group create %s --location %s', testResourceGroup, testLocation, function(result) {
          result.exitStatus.should.be.equal(0);
          done();
        });      
      });
    });

    after(function(done) {
      suite.execute('group delete %s --quiet', testResourceGroup, function() {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('basic', function() {

      it('management commands should work', function(done) {

        var vaultName = suite.generateId(vaultPrefix, knownNames);
        createVaultMustSucceed();

        function createVaultMustSucceed() {
          suite.execute('keyvault create %s --resource-group %s --location %s --json', vaultName, testResourceGroup, testLocation, function(result) {
            result.exitStatus.should.be.equal(0);
            setTimeout(showVaultMustSucceed, dnsUpdateWait);
          });
        }

        function showVaultMustSucceed() {
          suite.execute('keyvault show %s --resource-group %s --json', vaultName, testResourceGroup, function(result) {
            result.exitStatus.should.be.equal(0);
            var vault = JSON.parse(result.text);
            vault.should.have.property('name');
            vault.name.should.be.equal(vaultName);
            deleteVaultMustSucceed();
          });
        }

        function deleteVaultMustSucceed() {
          suite.execute('keyvault delete %s --json --quiet', vaultName, function(result) {
            result.exitStatus.should.be.equal(0);
            showVaultMustFail();
          });
        }

        function showVaultMustFail() {
          suite.execute('keyvault show %s --resource-group %s', vaultName, testResourceGroup, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include('Vault not found');
            done();
          });
        }

      });

      it('set-policy should work', function(done) {

        var vaultName = suite.generateId(vaultPrefix, knownNames);
        var objectId = '00000000-0000-0000-0000-000000000001';
        createVaultMustSucceed();

        function createVaultMustSucceed() {
          suite.execute('keyvault create %s --resource-group %s --location %s --json', vaultName, testResourceGroup, testLocation, function(result) {
            result.exitStatus.should.be.equal(0);
            setTimeout(setPolicySomePermsMustSucceed, dnsUpdateWait);
          });
        }

        function setPolicySomePermsMustSucceed() {
          suite.execute('keyvault set-policy %s --object-id %s --perms-to-keys ["create","import","delete"] --perms-to-secrets ["set","get"] --perms-to-certificates ["get","delete"] --enabled-for-deployment true --enabled-for-template-deployment true --enabled-for-disk-encryption true --json', vaultName, objectId, function(result) {
            result.exitStatus.should.be.equal(0);
            var vault = JSON.parse(result.text);
            vault.properties.accessPolicies.some(function(policy) {
              return policy.objectId.toLowerCase() === objectId.toLowerCase();
            }).should.be.true;
            vault.properties.enabledForDeployment.should.be.true;
            vault.properties.enabledForTemplateDeployment.should.be.true;
            vault.properties.enabledForDiskEncryption.should.be.true;
            setPolicyEmptyKeyPermsMustSucceedAndLetObjectIdThere();
          });
        }

        function setPolicyEmptyKeyPermsMustSucceedAndLetObjectIdThere() {
          suite.execute('keyvault set-policy %s --object-id %s --perms-to-keys [] --json', vaultName, objectId, function(result) {
            result.exitStatus.should.be.equal(0);
            var vault = JSON.parse(result.text);
            vault.properties.accessPolicies.some(function(policy) {
              return policy.objectId.toLowerCase() === objectId.toLowerCase();
            }).should.be.true;
            vault.properties.enabledForDeployment.should.be.true;
            vault.properties.enabledForTemplateDeployment.should.be.true;
            vault.properties.enabledForDiskEncryption.should.be.true;
            setPolicyEmptySecretPermsMustSucceedAndLetObjectIdThere();
          });
        }

        function setPolicyEmptySecretPermsMustSucceedAndLetObjectIdThere() {
          suite.execute('keyvault set-policy %s --object-id %s --perms-to-secrets [] --json', vaultName, objectId, function(result) {
            result.exitStatus.should.be.equal(0);
            var vault = JSON.parse(result.text);
            vault.properties.accessPolicies.some(function(policy) {
              return policy.objectId.toLowerCase() === objectId.toLowerCase();
            }).should.be.true;
            setPolicyEmptyCertificatePermsMustSucceedAndKillObjectId();
          });
        }

        function setPolicyEmptyCertificatePermsMustSucceedAndKillObjectId() {
          suite.execute('keyvault set-policy %s --object-id %s --perms-to-certificates [] --json', vaultName, objectId, function(result) {
            result.exitStatus.should.be.equal(0);
            var vault = JSON.parse(result.text);
            vault.properties.accessPolicies.some(function(policy) {
              return policy.objectId.toLowerCase() === objectId.toLowerCase();
            }).should.be.false;
            deleteVaultMustSucceed();
          });
        }
        
        function deleteVaultMustSucceed() {
          suite.execute('keyvault delete %s --json --quiet', vaultName, function(result) {
            done();
          });
        }

      });

    });

  });
});