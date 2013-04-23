/**
* Copyright 2012 Microsoft Corporation
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

require('should');
var sinon = require('sinon');
var fs = require('fs');

var keyFiles = require('../../lib/util/keyFiles');
var executeCmd = require('../framework/cli-executor').execute;

var testFile = './test/data/account-credentials.publishsettings';

describe('cli', function(){
  describe('account', function() {
    describe('import', function() {
      beforeEach(function (done) {
        var currentCertificate = process.env.AZURE_CERTIFICATE;
        var currentCertificateKey = process.env.AZURE_CERTIFICATE_KEY;

        var realRead = keyFiles.readFromFile;

        sinon.stub(keyFiles, 'readFromFile', function (filename) {
          if (filename === testFile) {
            var data = realRead(filename);
            return data;
          } else {
            return {
              cert: currentCertificate,
              key: currentCertificateKey
            };
          }
        });

        sinon.stub(keyFiles, 'writeToFile', function (filename, data) {
          currentCertificateKey = data.key;
          currentCertificate = data.cert;
        });

        done();
      });

      afterEach(function (done) {
        if (keyFiles.readFromFile.restore) {
          keyFiles.readFromFile.restore();
        }

        if (keyFiles.writeToFile.restore) {
          keyFiles.writeToFile.restore();
        }

        done();
      });

      it('should import certificate', function(done) {
        var cmd = ('node cli.js account import ' + testFile + ' --skipregister').split(' ');
        executeCmd(cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});