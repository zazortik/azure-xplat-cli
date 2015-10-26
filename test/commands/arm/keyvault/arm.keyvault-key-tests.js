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
var keyPrefix = 'xplatTestVaultKey';
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

  describe('keyvault-key', function() {
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
      it('key management commands should work', function(done) {

        var keyName = suite.generateId(keyPrefix, knownNames);
        var keyId;
        createKeyMustSucceed();

        function createKeyMustSucceed() {
          suite.execute('keyvault key create %s %s --destination Software --json', testVault, keyName, function(result) {
            result.exitStatus.should.be.equal(0);
            showKeyMustSucceed();
          });
        }

        function showKeyMustSucceed() {
          suite.execute('keyvault key show %s %s --json', testVault, keyName, function(result) {
            result.exitStatus.should.be.equal(0);
            var key = JSON.parse(result.text);
            key.should.have.property('key');
            key.key.should.have.property('kid');
            keyId = key.key.kid;
            keyId.should.include(util.format('https://%s.vault.azure.net/keys/%s/', testVault.toLowerCase(), keyName));
            listKeysMustSucceed();
          });
        }

        function listKeysMustSucceed() {
          suite.execute('keyvault key list %s --json', testVault, function(result) {
            result.exitStatus.should.be.equal(0);
            var keys = JSON.parse(result.text);
            keys.some(function(key) {
              return keyId.indexOf(key.kid + '/') === 0;
            }).should.be.true;
            listKeyVersionsMustSucceed();
          });
        }

        function listKeyVersionsMustSucceed() {
          suite.execute('keyvault key list-versions %s -k %s --json', testVault, keyName, function(result) {
            result.exitStatus.should.be.equal(0);
            var keys = JSON.parse(result.text);
            keys.some(function(key) {
              return key.kid === keyId;
            }).should.be.true;
            deleteKeyMustSucceed();
          });
        }

        function deleteKeyMustSucceed() {
          suite.execute('keyvault key delete %s %s --quiet', testVault, keyName, function(result) {
            result.exitStatus.should.be.equal(0);
            showKeyMustFail();
          });
        }

        function showKeyMustFail() {
          suite.execute('keyvault key show %s %s', testVault, keyName, function(result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include(util.format('Key %s not found', keyName));
            done();
          });
        }

      });

    });

  });
});