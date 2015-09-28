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

var testprefix = 'arm-cli-keyvault-tests';
var secretPrefix = 'xplatTestVaultSecret';
var knownNames = [];

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_TEST_VAULT',
  defaultValue: 'XplatTestVaultMSTest'
}];

var galleryTemplateName;
var galleryTemplateUrl;

describe('arm', function() {

  describe('keyvault-secret', function() {
    var suite;
    var testVault;

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        testVault = process.env.AZURE_ARM_TEST_VAULT;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('basic', function() {
      it('secret management commands should work', function(done) {

        var secretName = suite.generateId(secretPrefix, knownNames);
        var secretValue = 'Chocolate_is_hidden_in_toothpaste_cabinet';
        var secretId;
        setSecretMustSucceed();

        function setSecretMustSucceed() {
          suite.execute('keyvault secret set %s %s %s', testVault, secretName, secretValue, function(result) {
            result.exitStatus.should.be.equal(0);
            showSecretMustSucceed();
          });
        }

        function showSecretMustSucceed() {
          suite.execute('keyvault secret show %s %s --json', testVault, secretName, function(result) {
            result.exitStatus.should.be.equal(0);
            var secret = JSON.parse(result.text);
            secret.should.have.property('id');
            secretId = secret.id;
            secretId.should.include(util.format('https://%s.vault.azure.net/secrets/%s/', testVault.toLowerCase(), secretName));
            secret.should.have.property('value');
            secret.value.should.be.equal(secretValue);
            listSecretsMustSucceed();
          });
        }

        function listSecretsMustSucceed() {
          suite.execute('keyvault secret list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var secrets = JSON.parse(result.text);
            secrets.some(function(secret) {
              return secretId.indexOf(secret.id + '/') === 0;
            }).should.be.true;
            listSecretVersionsMustSucceed();
          });
        }

        function listSecretVersionsMustSucceed() {
          suite.execute('keyvault secret list-versions %s -s %s --json', testVault, secretName, function(result) {
            result.exitStatus.should.be.equal(0);
            var secrets = JSON.parse(result.text);
            secrets.some(function(secret) {
              return secret.id === secretId;
            }).should.be.true;
            deleteSecretMustSucceed();
          });
        }

        function deleteSecretMustSucceed() {
          suite.execute('keyvault secret delete %s %s --quiet', testVault, secretName, function(result) {
            result.exitStatus.should.be.equal(0);
            showSecretMustFail();
          });
        }

        function showSecretMustFail() {
          suite.execute('keyvault secret show %s %s', testVault, secretName, function(result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include(util.format('Secret not found: %s', secretName));
            done();
          });
        }

      });

    });

  });
});