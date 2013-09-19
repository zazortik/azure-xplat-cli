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
var fs = require('fs');

var keyFiles = require('../../lib/util/keyFiles');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');
var suite = new CLITest();

var testFile = './test/data/account-credentials.publishSettings';

describe('cli', function () {
  describe('account', function() {
    describe('env', function () {
      describe('list', function () {
        it('should work', function (done) {
          suite.execute('account env list --json', function (result) {
            result.exitStatus.should.equal(0);
            var environments = JSON.parse(result.text);

            should.exist(environments.AzureCloud);
            should.exist(environments.AzureChinaCloud);
            should.exist(environments.AzureCloud.publishingProfile);
            should.exist(environments.AzureChinaCloud.publishingProfile);

            done();
          });
        });
      });
    });

    describe('import', function() {
      beforeEach(function (done) {
        var currentCertificate = process.env.AZURE_CERTIFICATE;
        var currentCertificateKey = process.env.AZURE_CERTIFICATE_KEY;

        var realRead = keyFiles.readFromFile;

        var filesExist = [];

        sinon.stub(fs, 'mkdirSync', function () { });

        sinon.stub(fs, 'writeFileSync', function (filename, data) {
          filesExist.push({ name: filename, data: data });
        });

        sinon.stub(fs, 'writeFile', function (filename, data, callback) { callback(); });

        var originalReadFileSync = fs.readFileSync;
        sinon.stub(fs, 'readFileSync', function (filename) {
          if (filename === testFile) {
            return originalReadFileSync(filename, 'utf8');
          } else {
            return filesExist.filter(function (f) {
              return f.name === filename;
            })[0].data;
          }
        });

        sinon.stub(utils, 'writeFileSyncMode', function (filename, data) {
          filesExist.push({ name: filename, data: data });
        });

        sinon.stub(utils, 'pathExistsSync', function (filename) {
          return filesExist.some(function (f) {
            return f.name === filename;
          });
        });

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

        if (utils.writeFileSyncMode.restore) {
          utils.writeFileSyncMode.restore();
        }

        if (utils.pathExistsSync.restore) {
          utils.pathExistsSync.restore();
        }

        if (fs.mkdirSync.restore) {
          fs.mkdirSync.restore();
        }

        if (fs.writeFileSync.restore) {
          fs.writeFileSync.restore();
        }

        if (fs.writeFile.restore) {
          fs.writeFile.restore();
        }

        if (fs.readFile.restore) {
          fs.readFile.restore();
        }

        if (fs.readFileSync.restore) {
          fs.readFileSync.restore();
        }

        done();
      });

      it('should import certificate', function(done) {
        suite.execute('account import %s --skipregister', testFile, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('should work accounts', function (done) {
        suite.execute('account clear', function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});