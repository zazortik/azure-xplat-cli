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
var path = require('path');
var storage = require('azure-storage');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.storage.file-tests';
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
  describe('storage', function () {
    
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
    
    describe('share', function () {
      var shareName = 'storageclitest3';
      describe('create', function () {
        it('should create a new share', function (done) {
          suite.execute('storage share create %s --json', shareName, function (result) {
            var share = JSON.parse(result.text);
            share.name.should.equal(shareName);
            done();
          });
        });
      });
      
      describe('list', function () {
        it('should list all storage shares', function (done) {
          suite.execute('storage share list --json', function (result) {
            var shares = JSON.parse(result.text);
            shares.length.should.greaterThan(0);
            shares.forEach(function (share) {
              share.name.length.should.greaterThan(0);
            });
            
            done();
          });
        });
      });
      
      describe('show', function () {
        it('should show details of the specified share', function (done) {
          suite.execute('storage share show %s --json', shareName, function (result) {
            var share = JSON.parse(result.text);
            share.name.should.equal(shareName);
            done();
          });
        });
      });
      
      describe('delete', function () {
        it('should delete the specified share', function (done) {
          suite.execute('storage share delete %s -q --json', shareName, function (result) {
            done();
          });
        });
      });
    });
    
    describe('directory', function () {
      
      var shareName = 'directorytestshare';
      var directoryName = 'newdir';

      before(function (done) {
        var fileService = storage.createFileService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        fileService.createShare(shareName, function () { done(); });
      });
      
      after(function (done) {
        var fileService = storage.createFileService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        fileService.deleteShare(shareName, function () { done(); });
      });

      describe('create', function () {
        it('should create a new directory', function (done) {
          suite.execute('storage directory create %s %s --json', shareName, directoryName, function (result) {
            var directory = JSON.parse(result.text);
            directory.name.should.equal('newdir');
            done();
          });
        });
      });
      
      describe('delete', function () {
        it('should delete an existing directory', function (done) {
          suite.execute('storage directory delete -q %s %s --json', shareName, directoryName, function (result) {
            done();
          });
        });
      });
    });
    
    describe('file', function () {
      
      var shareName = 'filetestshare';
      var directoryName = 'newdir';
      var localFile = 'localfile.txt';
      var remoteFile = 'remotefile';
      var testCount = 3;
      var pushed = 0;
      var testFiles = [];
      
      before(function (done) {
        var fileService = storage.createFileService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        fileService.createShare(shareName, function () {
          fileService.createDirectory(shareName, directoryName, function () {
            var buf = new Buffer('HelloWord', 'utf8');
            for (var i = 0; i < testCount; i++) {
              var filePath = path.join(__dirname, i.toString() + localFile);
              var file = fs.openSync(filePath, 'w');
              fs.writeSync(file, buf, 0, buf.length, 0);
              testFiles.push(filePath);
              fileService.createFileFromLocalFile(shareName, '', i.toString() + remoteFile, filePath, function () {
                if (++pushed == testCount) {
                  done();
                }
              });
            }
          });
        });
      });
      
      after(function (done) {
        for (var i = 0; i < testFiles.length; i++) {
          fs.unlinkSync(testFiles[i]);
        }

        var fileService = storage.createFileService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        fileService.deleteShare(shareName, function () {
          fileService.deleteDirectory(shareName, directoryName, function () {
            done();
          });
        });
      });

      describe('upload', function () {
        it('should upload an existing file', function (done) {
          suite.execute('storage file upload %s -q %s %s --json', testFiles[0], shareName, remoteFile, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });

      describe('download', function () {
        it('should download an existing file', function (done) {
          suite.execute('storage file download -q %s %s %s --json', shareName, remoteFile, localFile, function (result) {
            result.errorText.should.be.empty;
            try { fs.unlinkSync(localFile); } catch (e) {}
            done();
          });
        });
      });

      describe('delete', function () {
        it('should delete an existing file', function (done) {
          suite.execute('storage file delete -q %s %s --json', shareName, remoteFile, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });

      describe('list', function () {
        it('should list files and directories', function (done) {
          suite.execute('storage file list %s --json', shareName, function (result) {
            result.errorText.should.be.empty;
            var listResult = JSON.parse(result.text);
            listResult.should.have.enumerable('files');
            listResult.should.have.enumerable('directories');
            listResult.files.should.be.lengthOf(testCount);
            listResult.directories.should.be.lengthOf(1);
            listResult.files.some(function (data) {
              data.name.should.match(/^.*remotefile$/);
            });
            listResult.directories.some(function (data) {
              data.name.should.match(/^.*dir$/);
            });
            done();
          });
        });
      });
    });
  });
});
