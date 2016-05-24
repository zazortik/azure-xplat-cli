//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
'use strict';

var should = require('should');
var utils = require('../../../lib/util/utils');
var CLITest = require('../../framework/arm-cli-test');

var path = require('path');
var createCertFilePath = path.resolve(__dirname, '../../data/batchtest.cer');
var certThumbprint = '59833fd835f827e9ec693a4c82435a6360cc6271';

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-certificate-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch certificate', function () {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      
      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }
      
      suite.setupSuite(function () {
        batchAccount = process.env.AZURE_BATCH_ACCOUNT;
        if (suite.isPlayback()) {
          batchAccountKey = 'non null default value';
        } else {
          batchAccountKey = process.env.AZURE_BATCH_ACCESS_KEY;
        }
        batchAccountEndpoint = process.env.AZURE_BATCH_ENDPOINT;
        
        done();
      });
    });
    
    after(function (done) {
      suite.teardownSuite(done);
    });
    
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should add a certifcate with cert file', function (done) {
      suite.execute('batch certificate create %s %s --account-name %s --account-key %s --account-endpoint %s --json', certThumbprint, createCertFilePath, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var createdCert = JSON.parse(result.text);
        createdCert.should.not.be.null;
        createdCert.thumbprint.should.equal(certThumbprint);
        done();
      });
    });
    
    it('should list certs under a batch account', function (done) {
      suite.execute('batch certificate list --account-name %s --account-key %s --account-endpoint %s --json', 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var certs = JSON.parse(result.text);
        certs.some(function (cert) {
          return cert.thumbprint === certThumbprint;
        }).should.be.true;
        done();
      });
    });

    it('should get cert base thumbprint', function (done) {
      suite.execute('batch certificate show %s --account-name %s --account-key %s --account-endpoint %s --json', 
        certThumbprint, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var cert = JSON.parse(result.text);
        cert.should.not.be.null;
        cert.thumbprint.should.equal(certThumbprint);
        cert.state.should.equal('active');
        done();
      });
    });

    it('should delete the created certificate', function (done) {
      suite.execute('batch certificate delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', 
        certThumbprint, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('batch certificate show %s --account-name %s --account-key %s --account-endpoint %s --json', 
          certThumbprint, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          if (result.exitStatus === 0) {
            var deletingCert = JSON.parse(result.text);
            deletingCert.state.should.equal('deleting');
          } else {
            result.text.should.equal('');
          }
          
          done();
        });
      });
    });

  });
});