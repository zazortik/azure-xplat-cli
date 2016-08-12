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

var storage = require('azure-storage');
var crypto = require('crypto');
var should = require('should');
var fs = require('fs');
var util = require('util');
var assert = require('assert');
var azureCommon = require('azure-common');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var aclTimeout;
var testPrefix = 'cli.storage.blob-tests';
var liveOnly = process.env.NOCK_OFF ? it : it.skip;

function stripAccessKey(connectionString) {
  return connectionString.replace(/AccountKey=[^;]+/, 'AccountKey=null');
}

function fetchAccountName(connectionString) {
  return connectionString.match(/AccountName=[^;]+/)[0].split('=')[1];
}

var requiredEnvironment = [
  { name: 'AZURE_STORAGE_CONNECTION_STRING', secure: stripAccessKey }
];

function generateTempFile (fileName, size, hasEmptyBlock, callback) {
  var blockSize = 4 * 1024 * 1024;
  var fileInfo = { name: fileName, contentMD5: '', size: size, content: '' };

  var md5hash = crypto.createHash('md5');
  var offset = 0;
  var file = fs.openSync(fileName, 'w');
  var saveContent = size <= blockSize;

  do {
    var value = crypto.randomBytes(1);
    var zero = hasEmptyBlock ? (parseInt(value[0], 10) >= 64) : false;
    var writeSize = Math.min(blockSize, size);
    var buffer;

    if (zero) {
      buffer = new Buffer(writeSize);
      buffer.fill(0);
    } else {
      buffer = crypto.randomBytes(writeSize);
    }

    fs.writeSync(file, buffer, 0, buffer.length, offset);
    size -= buffer.length;
    offset += buffer.length;
    md5hash.update(buffer);

    if (saveContent) {
      fileInfo.content += buffer.toString();
    }
  } while (size > 0);

  fileInfo.contentMD5 = md5hash.digest('base64');
  callback(fileInfo);
};

/**
* Convert a cmd to azure storge cli
*/
describe('cli', function () {
  describe('storage', function() {

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.skipSubscription = true;
      aclTimeout = (suite.isRecording || !suite.isMocked) ? 30000 : 10;

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
        it('should show details of the specified container', function(done) {
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

      describe('stored access policy', function () {
        var policyName1 = 'containerpolicy01';
        var policyName2 = 'containerpolicy02';
        var start = new Date('2014-12-01').toISOString();
        var expiry = new Date('2099-12-31').toISOString();
        var permissions = 'rl';

        it('should create the container policy with read and list permission', function (done) {
          suite.execute('storage container policy create %s %s --permissions %s --start %s --expiry %s --json', containerName, policyName1, permissions, start, expiry, function (result) {
            var policies = JSON.parse(result.text);
            var names = Object.keys(policies);
            names.length.should.greaterThan(0);

            var found = false;
            for (var index in names) {
              if (names[index] === policyName1) {
                found = true;
                break;
              }
            }
            found.should.be.true;
            done();
          });
        });

        it('should show the created policy', function (done) {
          setTimeout(function() {
            suite.execute('storage container policy show %s %s --json', containerName, policyName1, function (result) {
              var policies = JSON.parse(result.text);
              var names = Object.keys(policies);
              names.length.should.greaterThan(0);

              var policy;
              for (var index in names) {
                policy = policies[names[index]];
                if (names[index] === policyName1) {
                  break;
                }
              }

              policy.Permissions.should.equal(permissions);
              policy.Start.should.equal(start);
              policy.Expiry.should.equal(expiry);
              done();
            });
          }, aclTimeout);
        });

        it('should list the policies', function (done) {
          suite.execute('storage container policy create %s %s --permissions %s --start %s --expiry %s --json', containerName, policyName2, permissions, start, expiry, function (result) {
            setTimeout(function() {
              suite.execute('storage container policy list %s --json', containerName, function (result) {
                var policies = JSON.parse(result.text);
                Object.keys(policies).length.should.equal(2);
                done();
              });
            }, aclTimeout);
          });
        });

        it('should set the policy', function (done) {
          var newPermissions = 'rwdl';
          var newStart = new Date('2015-12-01').toISOString();
          var newExpiry = new Date('2100-12-31').toISOString();
          suite.execute('storage container policy set %s %s --permissions %s --start %s --expiry %s --json', containerName, policyName1, newPermissions, newStart, newExpiry, function (result) {
            var policies = JSON.parse(result.text);
            var names = Object.keys(policies);
            names.length.should.greaterThan(0);

            var policy;
            for (var index in names) {
              policy = policies[names[index]];
              if (names[index] === policyName1) {
                break;
              }
            }

            policy.Permissions.should.equal(newPermissions);
            policy.Start.should.equal(newStart);
            policy.Expiry.should.equal(newExpiry);
            done();
          });
        });

        it('should delete the policy', function (done) {
          suite.execute('storage container policy delete %s %s --json', containerName, policyName1, function (result) {
            var policies = JSON.parse(result.text);
            Object.keys(policies).length.should.greaterThan(0);
            done();
          });
        });
      });

      describe('sas', function () {
        it('should create the container sas with list permission and list blobs', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage container sas create %s rl %s --start %s --json', containerName, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage blob list %s -a %s --sas %s --json', containerName, account, sas.sas, function (listResult) {
                listResult.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });
      });

      describe('lease', function () {
        var leaseId;
        var duration = 30;
        var breakDuration = 20;
        var proposedId = '633e7d74-5522-49ae-9f9f-64a860dd00ab';
        it('should acquire the an infinite lease against the specified container', function(done) {
          suite.execute('storage container lease acquire %s --json', containerName, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.not.be.emtpy;
            leaseId = lease.id;
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('leased');
              container.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should change the an existing lease against the specified container', function(done) {
          suite.execute('storage container lease change %s --lease %s --proposed-id %s --json', containerName, leaseId, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(proposedId);
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('leased');
              container.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should renew the an infinite lease against the specified container', function(done) {
          suite.execute('storage container lease renew %s --lease %s --json', containerName, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(proposedId);
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('leased');
              container.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should release the an existing lease against the specified container', function(done) {
          suite.execute('storage container lease release %s --lease %s --json', containerName, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            result.errorText.should.be.empty;
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('unlocked');
              container.lease.state.should.equal('available');
              done();
            });
          });
        });
        
        it('should acquire the an infinite lease against the specified container with a proposed ID', function(done) {
          suite.execute('storage container lease acquire %s --proposed-id %s --json', containerName, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(proposedId);
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('leased');
              container.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should break the an infinite lease immediately', function(done) {
          suite.execute('storage container lease break %s --json', containerName, function(result) {
            var lease = JSON.parse(result.text);
            lease.time.should.equal(0);
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('unlocked');
              container.lease.state.should.equal('broken');
              done();
            });
          });
        });
        
        it('should fail to renew the broken lease', function(done) {
          suite.execute('storage container lease renew %s %s --json', containerName, proposedId, function(result) {
            result.errorText.should.startWith('error: The lease ID matched, but the lease has been broken explicitly and cannot be renewed');
            done();
          });
        });
        
        it('should acquire the a 15 seconds lease against the specified container', function(done) {
          suite.execute('storage container lease acquire %s --duration %s --json', containerName, duration, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.not.be.emtpy;
            leaseId = lease.id;
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('leased');
              container.lease.duration.should.equal('fixed');

              setTimeout(function() {
                suite.execute('storage container show %s --json', containerName, function(result) {
                  var container = JSON.parse(result.text);
                  container.lease.status.should.equal('unlocked');
                  container.lease.state.should.equal('expired');
                  done();
                });
              }, duration * 1000);
            });
          });
        });
        
        it('should renew the an expired lease against the specified container', function(done) {
          suite.execute('storage container lease renew %s --lease %s --json', containerName, leaseId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(leaseId);
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('leased');
              container.lease.duration.should.equal('fixed');
              done();
            });
          });
        });
        
        it('should break the an existing lease with proposed duration', function(done) {
          suite.execute('storage container lease break %s --duration %s --json', containerName, breakDuration, function(result) {
            var lease = JSON.parse(result.text);
            lease.time.should.equal(breakDuration);
            
            suite.execute('storage container show %s --json', containerName, function(result) {
              var container = JSON.parse(result.text);
              container.lease.status.should.equal('locked');
              container.lease.state.should.equal('breaking');
              
              setTimeout(function() {
                suite.execute('storage container show %s --json', containerName, function(result) {
                  var container = JSON.parse(result.text);
                  container.lease.status.should.equal('unlocked');
                  container.lease.state.should.equal('broken');
                  done();
                });
              }, breakDuration * 1000);
            });
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
      var blockBlobName = 'blockblobname';
      var pageBlobName = 'pageblobname';
      var appendBlobName = 'appendblobname';
      var publicContainerName = 'storage-cli-blob-test-public';
      var publicBlobName = 'publicblob';
      before(function(done) {
        var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        blobService.createContainer(containerName, function(){done();});
      });

      after(function(done) {
        var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        blobService.deleteContainer(containerName, function(){done();});
      });
      
      describe('upload', function () {
        it('should create a block blob by uploading a basic file to azure storage', function (done) {
          blockBlobName = suite.generateId(blockBlobName);
          var buf = new Buffer('HelloWorld', 'utf8');
          var fileName = 'hello.block.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var contentMD5 = md5Hash.digest('base64');
          suite.execute('storage blob upload %s %s %s --json', fileName, containerName, blockBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(blockBlobName);
            blob.contentSettings.contentMD5.should.equal(contentMD5);
            fs.unlinkSync(fileName);

            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.blobType.should.equal('BlockBlob');
              done();
            });
          });
        });

        it('should create a page blob by uploading a basic file to azure storage', function (done) {
          pageBlobName = suite.generateId(pageBlobName);
          var buf = new Buffer(512);
          if (suite.isMocked) { buf.fill(1); }
          var fileName = 'hello.page.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var contentMD5 = md5Hash.digest('base64');
          suite.execute('storage blob upload %s %s %s -t page --json', fileName, containerName, pageBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(pageBlobName);
            blob.contentSettings.contentMD5.should.equal(contentMD5);
            fs.unlinkSync(fileName);

            suite.execute('storage blob show %s %s --json', containerName, pageBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.blobType.should.equal('PageBlob');
              done();
            });
          });
        });

        it('should create a page blob by uploading a vhd file to azure storage by default', function (done) {
          pageBlobName = suite.generateId(pageBlobName);
          var buf = new Buffer(512);
          if (suite.isMocked) { buf.fill(1); }
          var fileName = 'hello.page.vhd';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var contentMD5 = md5Hash.digest('base64');
          suite.execute('storage blob upload %s %s %s --json', fileName, containerName, pageBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(pageBlobName);
            blob.contentSettings.contentMD5.should.equal(contentMD5);
            fs.unlinkSync(fileName);

            suite.execute('storage blob show %s %s --json', containerName, pageBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.blobType.should.equal('PageBlob');
              done();
            });
          });
        });

        it('should create an append blob by uploading a basic file to azure storage', function (done) {
          appendBlobName = suite.generateId(appendBlobName);
          var buf = new Buffer('HelloWorld', 'utf8');
          var fileName = 'hello.append.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var contentMD5 = md5Hash.digest('base64');
          suite.execute('storage blob upload %s %s %s -t append --json', fileName, containerName, appendBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(appendBlobName);
            fs.unlinkSync(fileName);
            
            suite.execute('storage blob show %s %s --json', containerName, appendBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.blobType.should.equal('AppendBlob');
              done();
            });
          });
        });

        it('should be able to overwrite the blob by providing --lease when the blob is already leased', function (done) {
          blockBlobName = suite.generateId(blockBlobName);
          var buf = new Buffer('HelloWorld', 'utf8');
          var fileName = 'hello.block.lease.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var originalContentMD5 = md5Hash.digest('base64');
          
          suite.execute('storage blob upload %s %s %s --json', fileName, containerName, blockBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(blockBlobName);
            blob.contentSettings.contentMD5.should.equal(originalContentMD5);

            suite.execute('storage blob lease acquire %s %s --json', containerName, blockBlobName, function(result) {
              var lease = JSON.parse(result.text);
              lease.id.should.not.be.emtpy;
              var leaseId = lease.id;

              var bufUpdated = new Buffer('HelloWorldUpdated', 'utf8');
              fd = fs.openSync(fileName, 'w');
              fs.writeSync(fd, bufUpdated, 0, bufUpdated.length, 0);

              md5Hash = crypto.createHash('md5');
              md5Hash.update(bufUpdated);
              var updatedContentMD5 = md5Hash.digest('base64');

              // No lease will get error
              suite.execute('storage blob upload %s %s %s -q --json', fileName, containerName, blockBlobName, leaseId, function (result) {
                (result.errorText.indexOf('There is currently a lease on the blob and no lease ID was specified in the request') !== -1).should.be.ok;

                // Correct lease will success
                suite.execute('storage blob upload %s %s %s --lease %s -q --json', fileName, containerName, blockBlobName, leaseId, function (result) {
                  var blob = JSON.parse(result.text);
                  blob.name.should.equal(blockBlobName);
                  blob.contentSettings.contentMD5.should.equal(updatedContentMD5);

                  fs.unlinkSync(fileName);
                  done();
                });
              });
            });
          });
        });
      });

      describe('update', function(){
        it('should update the blob properties by updating the blob', function (done) {
          blockBlobName = suite.generateId(blockBlobName);
          var buf = new Buffer('HelloWorld', 'utf8');
          var fileName = 'hello.block.updateproperties.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var contentMD5 = md5Hash.digest('base64');
          suite.execute('storage blob upload %s %s %s -p %s --json', fileName, containerName, blockBlobName, 'contentType=plain/text', function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(blockBlobName);
            blob.contentSettings.contentMD5.should.equal(contentMD5);
            fs.unlinkSync(fileName);

            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.blobType.should.equal('BlockBlob');
              blob.contentSettings.contentType.should.equal('plain/text');
              blob.contentSettings.contentMD5.should.equal(contentMD5);

              suite.execute('storage blob update %s %s -p %s --json', containerName, blockBlobName, 'contentType=text/xml', function (result) {
                suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function (result) {
                  var blob = JSON.parse(result.text);
                  blob.contentSettings.contentType.should.equal('text/xml');
                  //ContentMD5 should not updated and should NOT cleared as user didn't supply it
                  blob.contentSettings.contentMD5.should.equal(contentMD5);

                  done();
                });
              });
            });
          });
        });
      })

      describe('list', function () {
        it('should list all blobs', function (done) {
          suite.execute('storage blob list %s --json', containerName, function (result) {
            var blobs = JSON.parse(result.text);
            blobs.length.should.greaterThan(0);
            blobs.some(function (blob) {
              return blob.name === blockBlobName;
            }).should.be.true;
            blobs.some(function (blob) {
              return blob.name === pageBlobName;
            }).should.be.true;
            blobs.some(function (blob) {
              return blob.name === appendBlobName;
            }).should.be.true;
            done();
          });
        });
      });
      
      describe('show', function () {
        it('should show specified block blob', function (done) {
          suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(blockBlobName);
            done();
          });
        });

        it('should show specified page blob', function (done) {
          suite.execute('storage blob show %s %s --json', containerName, pageBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(pageBlobName);
            done();
          });
        });

        it('should show specified append blob', function (done) {
          suite.execute('storage blob show %s %s --json', containerName, appendBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(appendBlobName);
            done();
          });
        });
      });
      
      describe('download', function () {
        it('should download the specified block blob', function (done) {
          var fileName = 'hello.download.txt';
          suite.execute('storage blob download %s %s %s -q -m --json', containerName, blockBlobName, fileName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(blockBlobName);
            blob.fileName.should.equal(fileName);
            fs.unlinkSync(fileName);
            done();
          });
        });
        
        liveOnly('should download blob in public container with anonymous credential', function(done) {
          var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          blobService.createContainer(publicContainerName, { publicAccessLevel: 'container'}, function(err) {
            publicBlobName = suite.generateId(publicBlobName);
            var fileName = 'hello.block.anonymous.txt';
            var downloadFileName = 'hello.block.anonymous.download.txt';
            generateTempFile(fileName, 65 * 1024 * 1024, false, function (fileInfo) {
              suite.execute('storage blob upload %s %s %s --json', fileName, publicContainerName, publicBlobName, function (result) {
                var blob = JSON.parse(result.text);
                blob.name.should.equal(publicBlobName);
                blob.contentSettings.contentMD5.should.equal(fileInfo.contentMD5);
                fs.unlinkSync(fileName);

                var anonymousConnectionString = 'BlobEndpoint=' + blobService.host.primaryHost;
                suite.execute('storage blob download %s %s %s -q -c %s --json', publicContainerName, publicBlobName, downloadFileName, anonymousConnectionString, function (result) {
                  var blob = JSON.parse(result.text);
                  blob.name.should.equal(publicBlobName);
                  blob.fileName.should.equal(downloadFileName);
                  fs.unlinkSync(downloadFileName);
                  blobService.deleteContainer(publicContainerName, function(){done();});
                });
              });
            });
          });
        });
        
        it('should download blob snapshot', function(done) {
          blockBlobName = suite.generateId(blockBlobName);
          var buf = new Buffer('HelloWorld', 'utf8');
          var fileName = 'hello.block.snapshot.txt';
          var downloadFileName = 'hello.block.snapshot.download.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var originalContentMD5 = md5Hash.digest('base64');
          
          suite.execute('storage blob upload %s %s %s --json', fileName, containerName, blockBlobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(blockBlobName);
            blob.contentSettings.contentMD5.should.equal(originalContentMD5);

            suite.execute('storage blob snapshot %s %s --json', containerName, blockBlobName, function (result) {
              var blob = JSON.parse(result.text);
              var snapshotId = blob.snapshot;

              var bufUpdated = new Buffer('HelloWorldUpdated', 'utf8');
              fd = fs.openSync(fileName, 'w');
              fs.writeSync(fd, bufUpdated, 0, bufUpdated.length, 0);

              md5Hash = crypto.createHash('md5');
              md5Hash.update(bufUpdated);
              var updatedContentMD5 = md5Hash.digest('base64');

              suite.execute('storage blob upload %s %s %s -q --json', fileName, containerName, blockBlobName, function (result) {
                var blob = JSON.parse(result.text);
                blob.name.should.equal(blockBlobName);
                blob.contentSettings.contentMD5.should.equal(updatedContentMD5);

                fs.unlinkSync(fileName);

                suite.execute('storage blob download %s %s %s --snapshot %s -q -m --json', containerName, blockBlobName, downloadFileName, snapshotId, function (result) {
                  var blob = JSON.parse(result.text);
                  blob.contentSettings.contentMD5.should.equal(originalContentMD5);
                  
                  fs.unlinkSync(downloadFileName);
                  done();
                });
              });
            });
          });
        });

        it('should download the specified page blob', function (done) {
          var fileName = 'hello.download.page.txt';
          suite.execute('storage blob download %s %s %s -q -m --json', containerName, pageBlobName, fileName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(pageBlobName);
            blob.fileName.should.equal(fileName);
            fs.unlinkSync(fileName);
            done();
          });
        });

        it('should download the specified append blob', function (done) {
          var fileName = 'hello.download.append.txt';
          suite.execute('storage blob download %s %s %s -q -m --json', containerName, appendBlobName, fileName, function (result) {
            var blob = JSON.parse(result.text);
            blob.name.should.equal(appendBlobName);
            blob.fileName.should.equal(fileName);
            fs.unlinkSync(fileName);
            done();
          });
        });
      });

      var blockBlobSnapshot;
      var pageBlobSnapshot;
      var appendBlobSnapshot;
      describe('snapshot', function () {
        it ('should create 3 snapshots of the block blob', function (done) {
          suite.execute('storage blob snapshot %s %s --json', containerName, blockBlobName, function (result) {
            var snapshot = JSON.parse(result.text);
            snapshot.snapshot.should.not.be.empty;
            snapshot.url.should.endWith(snapshot.snapshot);
             
            suite.execute('storage blob snapshot %s %s --json', containerName, blockBlobName, function (result) {
              snapshot = JSON.parse(result.text);
              blockBlobSnapshot = snapshot.snapshot;
              snapshot.snapshot.should.not.be.empty;
              snapshot.url.should.endWith(snapshot.snapshot);
              
              suite.execute('storage blob snapshot %s %s --json', containerName, blockBlobName, function (result) {
                snapshot = JSON.parse(result.text);
                blockBlobSnapshot = snapshot.snapshot;
                snapshot.snapshot.should.not.be.empty;
                snapshot.url.should.endWith(snapshot.snapshot);
                done();
              });
            });
          });
        });
        
        it ('should create 3 snapshots of the page blob', function (done) {
          suite.execute('storage blob snapshot %s %s --json', containerName, pageBlobName, function (result) {
            var snapshot = JSON.parse(result.text);
            snapshot.snapshot.should.not.be.empty;
            snapshot.url.should.endWith(snapshot.snapshot);
            
            suite.execute('storage blob snapshot %s %s --json', containerName, pageBlobName, function (result) {
              snapshot = JSON.parse(result.text);
              pageBlobSnapshot = snapshot.snapshot;
              snapshot.snapshot.should.not.be.empty;
              snapshot.url.should.endWith(snapshot.snapshot);
              
              suite.execute('storage blob snapshot %s %s --json', containerName, pageBlobName, function (result) {
                snapshot = JSON.parse(result.text);
                pageBlobSnapshot = snapshot.snapshot;
                snapshot.snapshot.should.not.be.empty;
                snapshot.url.should.endWith(snapshot.snapshot);
                done();
              });
            });
          });
        });
        
        it ('should create 3 snapshots of the append blob', function (done) {
          suite.execute('storage blob snapshot %s %s --json', containerName, appendBlobName, function (result) {
            var snapshot = JSON.parse(result.text);
            snapshot.snapshot.should.not.be.empty;
            snapshot.url.should.endWith(snapshot.snapshot);
            
            suite.execute('storage blob snapshot %s %s --json', containerName, appendBlobName, function (result) {
              snapshot = JSON.parse(result.text);
              appendBlobSnapshot = snapshot.snapshot;
              snapshot.snapshot.should.not.be.empty;
              snapshot.url.should.endWith(snapshot.snapshot);
              
              suite.execute('storage blob snapshot %s %s --json', containerName, appendBlobName, function (result) {
                snapshot = JSON.parse(result.text);
                appendBlobSnapshot = snapshot.snapshot;
                snapshot.snapshot.should.not.be.empty;
                snapshot.url.should.endWith(snapshot.snapshot);
                done();
              });
            });
          });
        });
      });
      
      describe('lease', function () {
        var leaseId;
        var duration = 30;
        var breakDuration = 20;
        var proposedId = '633e7d74-5522-49ae-9f9f-64a860dd00ab';
        it('should acquire the an infinite lease against the specified blob', function(done) {
          suite.execute('storage blob lease acquire %s %s --json', containerName, blockBlobName, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.not.be.emtpy;
            leaseId = lease.id;
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('leased');
              blob.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should change the an existing lease against the specified blob', function(done) {
          suite.execute('storage blob lease change %s %s --lease %s --proposed-id %s --json', containerName, blockBlobName, leaseId, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(proposedId);
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('leased');
              blob.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should renew the an infinite lease against the specified blob', function(done) {
          suite.execute('storage blob lease renew %s %s --lease %s --json', containerName, blockBlobName, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(proposedId);
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('leased');
              blob.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should release the an existing lease against the specified blob', function(done) {
          suite.execute('storage blob lease release %s %s --lease %s --json', containerName, blockBlobName, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            result.errorText.should.be.empty;
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('unlocked');
              blob.lease.state.should.equal('available');
              done();
            });
          });
        });
        
        it('should acquire the an infinite lease against the specified blob with a proposed ID', function(done) {
          suite.execute('storage blob lease acquire %s %s --proposed-id %s --json', containerName, blockBlobName, proposedId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(proposedId);
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('leased');
              blob.lease.duration.should.equal('infinite');
              done();
            });
          });
        });
        
        it('should break the an infinite lease immediately', function(done) {
          suite.execute('storage blob lease break %s %s --json', containerName, blockBlobName, function(result) {
            var lease = JSON.parse(result.text);
            lease.time.should.equal(0);
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('unlocked');
              blob.lease.state.should.equal('broken');
              done();
            });
          });
        });
        
        it('should fail to renew the broken lease', function(done) {
          suite.execute('storage blob lease renew %s %s %s --json', containerName, blockBlobName, proposedId, function(result) {
            result.errorText.should.startWith('error: The lease ID matched, but the lease has been broken explicitly and cannot be renewed');
            done();
          });
        });
        
        it('should acquire the a 15 seconds lease against the specified blob', function(done) {
          suite.execute('storage blob lease acquire %s %s --duration %s --json', containerName, blockBlobName, duration, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.not.be.emtpy;
            leaseId = lease.id;
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('leased');
              blob.lease.duration.should.equal('fixed');

              setTimeout(function() {
                suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
                  var blob = JSON.parse(result.text);
                  blob.lease.status.should.equal('unlocked');
                  blob.lease.state.should.equal('expired');
                  done();
                });
              }, duration * 1000);
            });
          });
        });
        
        it('should renew the an expired lease against the specified blob', function(done) {
          suite.execute('storage blob lease renew %s %s --lease %s --json', containerName, blockBlobName, leaseId, function(result) {
            var lease = JSON.parse(result.text);
            lease.id.should.equal(leaseId);
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('leased');
              blob.lease.duration.should.equal('fixed');
              done();
            });
          });
        });
        
        it('should break the an existing lease with proposed duration', function(done) {
          suite.execute('storage blob lease break %s %s --duration %s --json', containerName, blockBlobName, breakDuration, function(result) {
            var lease = JSON.parse(result.text);
            lease.time.should.equal(breakDuration);
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
              var blob = JSON.parse(result.text);
              blob.lease.status.should.equal('locked');
              blob.lease.state.should.equal('breaking');
              
              setTimeout(function() {
                suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function(result) {
                  var blob = JSON.parse(result.text);
                  blob.lease.status.should.equal('unlocked');
                  blob.lease.state.should.equal('broken');
                  done();
                });
              }, breakDuration * 1000);
            });
          });
        });
      });
      
      describe('sas', function () {
        it('should list the blobs with sas', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage container sas create %s l %s --start %s --json', containerName, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage blob list %s -a %s --sas %s --json', containerName, account, sas.sas, function (listResult) {
                var blob = JSON.parse(listResult.text);
                (blob.length > 1).should.be.ok;
                listResult.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });

        it('should create the sas of the blob and show the blob', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage blob sas create %s %s rw %s --start %s --json', containerName, blockBlobName, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage blob show %s %s -a %s --sas %s --json', containerName, blockBlobName, account, sas.sas, function (showResult) {
                showResult.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });
      });

      describe('delete', function () {
        it('should report error when the --snapshot and --delete-snapshot only are specified', function (done) {
          suite.execute('storage blob delete %s %s --snapshot %s --delete-snapshots only -q --json', containerName, blockBlobName, blockBlobSnapshot, function (result) {
            result.errorText.should.startWith('error: The deleteSnapshots option cannot be included when deleting a specific snapshot using the snapshotId option');
            done();
          });
        });
        
        it('should report error when the --snapshot and --delete-snapshot inlcude are specified', function (done) {
          suite.execute('storage blob delete %s %s --snapshot %s --delete-snapshots include -q --json', containerName, blockBlobName, blockBlobSnapshot, function (result) {
            result.errorText.should.startWith('error: The deleteSnapshots option cannot be included when deleting a specific snapshot using the snapshotId option');
            done();
          });
        });
        
        it('should delete the snapshot of the block blob', function (done) {
          suite.execute('storage blob delete %s %s --snapshot %s -q --json', containerName, blockBlobName, blockBlobSnapshot, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should only delete the snapshots of the block blob', function (done) {
          suite.execute('storage blob delete %s %s --delete-snapshots only -q --json', containerName, blockBlobName, blockBlobSnapshot, function (result) {
            result.errorText.should.be.empty;
            
            suite.execute('storage blob show %s %s --json', containerName, blockBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.name.should.equal(blockBlobName);
              done();
            });
          });
        });
        
        it('should delete the snapshot of the page blob', function (done) {
          suite.execute('storage blob delete %s %s --snapshot %s -q --json', containerName, pageBlobName, pageBlobSnapshot, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should only delete the snapshots of the page blob', function (done) {
          suite.execute('storage blob delete %s %s --delete-snapshots only -q --json', containerName, pageBlobName, pageBlobSnapshot, function (result) {
            result.errorText.should.be.empty;
            
            suite.execute('storage blob show %s %s --json', containerName, pageBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.name.should.equal(pageBlobName);
              done();
            });
          });
        });
        
        it('should delete the snapshot of the append blob', function (done) {
          suite.execute('storage blob delete %s %s --snapshot %s -q --json', containerName, appendBlobName, appendBlobSnapshot, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should only delete the snapshots of the append blob', function (done) {
          suite.execute('storage blob delete %s %s --delete-snapshots only -q --json', containerName, appendBlobName, appendBlobSnapshot, function (result) {
            result.errorText.should.be.empty;
            
            suite.execute('storage blob show %s %s --json', containerName, appendBlobName, function (result) {
              var blob = JSON.parse(result.text);
              blob.name.should.equal(appendBlobName);
              done();
            });
          });
        });
        
        it('should delete the specified block blob with its snapshots', function (done) {
          suite.execute('storage blob delete %s %s -q --json', containerName, blockBlobName, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });

        it('should delete the specified page blob with its snapshots', function (done) {
          suite.execute('storage blob delete %s %s -q --json', containerName, pageBlobName, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });

        it('should delete the specified append blob with its snapshots', function (done) {
          suite.execute('storage blob delete %s %s -q --json', containerName, appendBlobName, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });

      describe('copy', function () {
        var destContainer = 'testblobcopydest';
        var sourceContainer = 'testblobcopysource';
        var blobName = 'toCopy';
        var fileName = 'copytoblob.tmp.txt';
        var sourceShare = 'testblobcopyshare';
        var sourceDir = 'testblobcopydir';
        var sourceFilePath = sourceDir + '/' + fileName;
        var blobService;
        var fileService;

        it('should prepare the source file and blob', function(done) {
          blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          fileService = storage.createFileService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          blobService.createContainerIfNotExists(sourceContainer, function (error) {
            assert.equal(error, null);
            blobService.createContainerIfNotExists(destContainer, function (error) {
              assert.equal(error, null);
              var buf = new Buffer('HelloWorld', 'utf8');
              var fd = fs.openSync(fileName, 'w');
              fs.writeSync(fd, buf, 0, buf.length, 0);
              blobService.createBlockBlobFromLocalFile(sourceContainer, blobName, fileName, function (error) {
                assert.equal(error, null);
                fileService.createShareIfNotExists(sourceShare, function (error) {
                  assert.equal(error, null);
                  fileService.createDirectoryIfNotExists(sourceShare, sourceDir, function (error) {
                    assert.equal(error, null);
                    fileService.createFileFromLocalFile(sourceShare, sourceDir, fileName, fileName, function (error) {
                      assert.equal(error, null);
                      fs.unlinkSync(fileName);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
        
        it('should start to copy the blob\'s snapshot', function (done) {
          suite.execute('storage blob snapshot %s %s --json', sourceContainer, blobName, function (result) {
            result.errorText.should.be.empty;
            var blob = JSON.parse(result.text);
            blob.snapshot.should.not.be.empty;

            suite.execute('storage blob copy start --source-container %s --source-blob %s --snapshot %s --dest-container %s -q --json', 
              sourceContainer, blobName, blob.snapshot, destContainer, function (result) {
              var copy = JSON.parse(result.text);
              copy.copy.id.length.should.greaterThan(0);
              result.errorText.should.be.empty;
              done();
            });
          });
        });
        
        it('should start to copy the blob\'s snapshot by SAS asynchronously', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage container sas create %s r %s --start %s --json', sourceContainer, expiry, start, function (result) {
            var sourceSas = JSON.parse(result.text);
            sourceSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            suite.execute('storage container sas create %s w %s --json', destContainer, expiry, function (result) {
              var destSas = JSON.parse(result.text);
              destSas.sas.should.not.be.empty;
              result.errorText.should.be.empty;
              
              suite.execute('storage blob snapshot %s %s --json', sourceContainer, blobName, function (result) {
                result.errorText.should.be.empty;
                var blob = JSON.parse(result.text);
                blob.snapshot.should.not.be.empty;
                
                if (!suite.isMocked) {
                  var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
                  suite.execute('storage blob copy start --source-container %s --source-blob %s --snapshot %s -a %s --source-sas %s --dest-container %s --dest-account-name %s --dest-sas %s -q --json', 
                    sourceContainer, blobName, blob.snapshot, account, sourceSas.sas, destContainer, account, destSas.sas, function (result) {
                    var copy = JSON.parse(result.text);
                    copy.copy.id.length.should.greaterThan(0);
                    result.errorText.should.be.empty;
                    done();
                  });
                } else {
                  done();
                }
              });
            })
          });
        });

        it('should start to copy the blob specified by SAS asynchronously', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage container sas create %s r %s --start %s --json', sourceContainer, expiry, start, function (result) {
            var sourceSas = JSON.parse(result.text);
            sourceSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            suite.execute('storage container sas create %s w %s --json', destContainer, expiry, function (result) {
              var destSas = JSON.parse(result.text);
              destSas.sas.should.not.be.empty;
              result.errorText.should.be.empty;

              if (!suite.isMocked) {
                var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
                suite.execute('storage blob copy start --source-container %s --source-blob %s -a %s --source-sas %s --dest-container %s --dest-account-name %s --dest-sas %s -q --json', 
                  sourceContainer, blobName, account, sourceSas.sas, destContainer, account, destSas.sas, function (result) {
                  var copy = JSON.parse(result.text);
                  copy.copy.id.length.should.greaterThan(0);
                  result.errorText.should.be.empty;
                  done();
                });
              } else {
                done();
              }
            })
          });
        });
        
        it('should start to copy the blob specified by SAS starts with question mark', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage container sas create %s r %s --start %s --json', sourceContainer, expiry, start, function (result) {
            var sourceSas = JSON.parse(result.text);
            sourceSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;
            
            suite.execute('storage container sas create %s w %s --json', destContainer, expiry, function (result) {
              var destSas = JSON.parse(result.text);
              destSas.sas.should.not.be.empty;
              result.errorText.should.be.empty;
              
              if (!suite.isMocked) {
                var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
                sourceSas.sas = '?' + sourceSas.sas;
                destSas.sas = '?' + destSas.sas;
                suite.execute('storage blob copy start --source-container %s --source-blob %s -a %s --source-sas %s --dest-container %s --dest-account-name %s --dest-sas %s -q --json', 
                  sourceContainer, blobName, account, sourceSas.sas, destContainer, account, destSas.sas, function (result) {
                  var copy = JSON.parse(result.text);
                  copy.copy.id.length.should.greaterThan(0);
                  result.errorText.should.be.empty;
                  done();
                });
              } else {
                done();
              }
            })
          });
        });

        it('should show the copy status of the specified blob with SAS', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage container sas create %s r %s --start %s --json', destContainer, expiry, start, function (result) {
            var destSas = JSON.parse(result.text);
            destSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage blob copy show --container %s --blob %s -a %s --sas %s --json', destContainer, blobName, account, destSas.sas, function (result) {
                var copy = JSON.parse(result.text);
                copy.copy.id.length.should.greaterThan(0);
                result.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });

        it('should start to copy the blob specified by URI asynchronously', function (done) {
          if (!suite.isMocked) {
            var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
            var start = new Date('2014-10-01').toISOString();
            var expiry = new Date('2099-12-31').toISOString();
            suite.execute('storage container sas create %s r %s --start %s --json', sourceContainer, expiry, start, function (result) {
              var sourceSas = JSON.parse(result.text);
              sourceSas.sas.should.not.be.empty;

              var sourceUri = blobService.getUrl(sourceContainer, blobName, sourceSas.sas);
              suite.execute('storage blob copy start %s --dest-container %s -q --json', sourceUri, destContainer, function (result) {
                var copy = JSON.parse(result.text);
                copy.copy.id.length.should.greaterThan(0);
                result.errorText.should.be.empty;
                done();
              });
            });
          } else {
            done();
          }
        });
        
        it('should start to copy the blob specified by container and blob name asynchronously', function (done) {
          suite.execute('storage blob copy start --source-container %s --source-blob %s --dest-container %s -q --json', sourceContainer, blobName, destContainer, function (result) {
            var copy = JSON.parse(result.text);
            copy.copy.id.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        var copyid;
        it('should show the copy status of the specified blob', function (done) {
          suite.execute('storage blob copy show --container %s --blob %s --json', destContainer, blobName, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copy.id;
            copyid.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should stop the copy of the specified blob', function (done) {
          suite.execute('storage blob copy stop --container %s --blob %s --copyid %s --json', destContainer, blobName, copyid, function (result) {
            result.errorText.should.startWith('error: There is currently no pending copy operation');
            done();
          });
        });

        it('should start to copy a file to the blob by specifying the file share and path', function (done) {
          suite.execute('storage blob copy start --source-share %s --source-path %s --dest-container %s -q --json', sourceShare, sourceFilePath, destContainer, function (result) {
            var copy = JSON.parse(result.text);
            copy.copy.id.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });

        it('should start to copy a file to the blob specified by the file URI', function (done) {
          if (!suite.isMocked) {
            var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
            var start = new Date('2014-10-01').toISOString();
            var expiry = new Date('2099-12-31').toISOString();
            suite.execute('storage share sas create %s r %s --start %s --json', sourceShare, expiry, start, function (result) {
              var sourceSas = JSON.parse(result.text);
              sourceSas.sas.should.not.be.empty;
              var sourceUri = fileService.getUrl(sourceShare, sourceDir, fileName, sourceSas.sas);
              suite.execute('storage blob copy start %s --dest-container %s -q --json', sourceUri, destContainer, function (result) {
                var copy = JSON.parse(result.text);
                copy.copy.id.length.should.greaterThan(0);
                result.errorText.should.be.empty;
                done();
              });
            });
          } else {
            done();
          }
        });

        it('should show the copy status of the specified file to the blob', function (done) {
          suite.execute('storage blob copy show --container %s --blob %s --json', destContainer, sourceFilePath, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copy.id;
            copyid.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should stop the copy of the specified file to the blob', function (done) {
          suite.execute('storage blob copy stop --container %s --blob %s --copyid %s --json', destContainer, sourceFilePath, copyid, function (result) {
            result.errorText.should.startWith('error: There is currently no pending copy operation');
            done();
          });
        });

        it('should cleanup the test file and blob', function(done) {
          blobService.deleteContainer(sourceContainer, function (error) {
            assert.equal(error, null);
            blobService.deleteContainer(destContainer, function (error) {
              assert.equal(error, null);
              fileService.deleteShare(sourceShare, function (error) {
                assert.equal(error, null);
                done();
              });
            });
          });
        });
      });
    });
  });
});
