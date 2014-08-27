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

var azure = require('azure');
var should = require('should');
var fs = require('fs');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.storage.blob-tests';
var crypto = require('crypto');

function stripAccessKey(connectionString) {
  return connectionString.replace(/AccountKey=[^;]+/, 'AccountKey=null');
}

var requiredEnvironment = [
  { name: 'AZURE_STORAGE_CONNECTION_STRING', secure: stripAccessKey }
];

/**
* Convert a cmd to azure storge cli
*/
describe('cli', function () {
  describe('storage', function() {

    before(function (done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.skipSubscription = true;

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
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

    describe('container', function() {
      var containerName = 'storageclitest';
      describe('create', function() {
        it('should create a new container', function(done) {
          suite.execute('storage container create %s --json', containerName, function(result) {
            var container = JSON.parse(result.text);
            container.name.should.equal(containerName);
            container.publicAccessLevel.should.equal('Off');
            done();
          });
        });
      });

      describe('list', function() {
        it('should list all storage containers', function(done) {
          suite.execute('storage container list --json', function(result) {
            var containers = JSON.parse(result.text);
            containers.length.should.greaterThan(0);
            containers.forEach(function(container) {
              container.name.length.should.greaterThan(0);
            });
            containers.some(function(container) {
              return container.publicAccessLevel == 'Container'
                || container.publicAccessLevel == 'Blob'
                || container.publicAccessLevel == 'Off';
            }).should.be.true;
            done();
          });
        });

        it('should support wildcard', function(done) {
          suite.execute('storage container list ' + containerName + '* --json', function(result) {
            var containers = JSON.parse(result.text);
            containers.length.should.greaterThan(0);
            containers.forEach(function(container) {
              container.name.should.equal(containerName);
            });
            done();
          });
        });
      });

      describe('show', function() {
        it('should show details of the specified container --json', function(done) {
          suite.execute('storage container show %s --json', containerName, function(result) {
            var container = JSON.parse(result.text);
            container.name.should.equal(containerName);
            done();
          });
        });
      });

      describe('set', function() {
        it('should set the container permission', function(done) {
          suite.execute('storage container set %s -p container --json', containerName, function(result) {
            var container = JSON.parse(result.text);
            container.name.should.equal(containerName);
            container.publicAccessLevel.should.equal('Container');
            done();
          });
        });
      });

      describe('delete', function() {
        it('should delete the specified container', function(done) {
          suite.execute('storage container delete %s -q --json', containerName, function(result) {
            done();
          });
        });
      });
    });

    describe('blob', function() {
      var containerName = 'storage-cli-blob-test';
      var blobName = 'blobname';
      before(function(done) {
        var blobService = azure.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        blobService.createContainer(containerName, function(){done();});
      });

      after(function(done) {
        var blobService = azure.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        blobService.deleteContainer(containerName, function(){done();});
      });

      it('should upload a basic file to azure storage', function(done) {
        var buf = new Buffer('HelloWord', 'utf8');
        var fileName = 'hello.tmp.txt';
        var fd = fs.openSync(fileName, 'w');
        fs.writeSync(fd, buf, 0, buf.length, 0);
        var md5Hash = crypto.createHash('md5');
        md5Hash.update(buf);
        var contentMD5 = md5Hash.digest('base64');
        suite.execute('storage blob upload %s %s %s --json', fileName, containerName, blobName, function(result) {
          var blob = JSON.parse(result.text);
          blob.blob.should.equal(blobName);
          blob.contentMD5.should.equal(contentMD5);
          fs.unlinkSync(fileName);
          done();
        });
      });

      it('should list all blobs', function(done) {
        suite.execute('storage blob list %s --json', containerName, function(result) {
          var blobs = JSON.parse(result.text);
          blobs.length.should.greaterThan(0);
          blobs.some(function(blob) {
            return blob.name === blobName;
          }).should.be.true;
          done();
        });
      });

      it('should show specified blob', function(done) {
        suite.execute('storage blob show %s %s --json', containerName, blobName, function(result) {
          var blob = JSON.parse(result.text);
          blob.blob.should.equal(blobName);
          done();
        });
      });

      it('should download the specified blob', function(done) {
        var fileName = 'hello.download.txt';
        suite.execute('storage blob download %s %s %s -q -m --json', containerName, blobName, fileName, function(result) {
          var blob = JSON.parse(result.text);
          blob.blob.should.equal(blobName);
          blob.fileName.should.equal(fileName);
          fs.unlinkSync(fileName);
          done();
        });
      });

      it('should delete the specified blob', function(done) {
        suite.execute('storage blob delete %s %s --json', containerName, blobName, function(result) {
          result.errorText.should.be.empty;
          done();
        });
      });
      
      var destContainer = 'test';
      it('should start to copy the blob specified by URI asynchronously', function (done) {
        var sourceUri = 'https://cliportalvhdsglh0yqqb13w7g.blob.core.windows.net/vhds/clitest-2014-07-21.vhd?se=2014-08-05T09%3A35%3A10Z&sp=r&sv=2014-02-14&sr=b&sig=%2Btmf9%2F2ka6X9IKgD%2FiM4oGH7x6Qr0TBd8ywq2LyDaEY%3D';
        suite.execute('storage blob copy start %s --dest-container %s --json', sourceUri, destContainer, function (result) {
          var copy = JSON.parse(result.text);
          copy.copyId.length.should.greaterThan(0);
          result.errorText.should.be.empty;
          done();
        });
      });

      it('should start to copy the blob specified by container and blob name asynchronously', function (done) {
        var sourceContainer = 'vhds';
        var sourceBlob = 'clitest-2014-07-21.vhd';
        suite.execute('storage blob copy start --source-container %s --source-blob %s --dest-container %s -q --json', sourceContainer, sourceBlob, destContainer, function (result) {
          var copy = JSON.parse(result.text);
          copy.copyId.length.should.greaterThan(0);
          result.errorText.should.be.empty;
          done();
        });
      });

      var copyid;
      var destBlob = 'clitest-2014-07-21.vhd';
      it('should show the copy status of the specified blob', function (done) {
        suite.execute('storage blob copy show --container %s --blob %s --json', destContainer, destBlob, function (result) {
          var copy = JSON.parse(result.text);
          copyid = copy.copyId;
          copy.copyId.length.should.greaterThan(0);
          result.errorText.should.be.empty;
          done();
        });
      });

      it('should stop the copy of the specified blob', function (done) {
        suite.execute('storage blob copy stop --container %s --blob %s --copyid %s --json', destContainer, destBlob, copyid, function (result) {
          result.errorText.should.be.empty;
          done();
        });
      });
    });
  });
});
