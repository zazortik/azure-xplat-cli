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

var should = require('should');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var storage = require('azure-storage');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var aclTimeout;
var testPrefix = 'cli.storage.file-tests';
var crypto = require('crypto');

function stripAccessKey(connectionString) {
  return connectionString.replace(/AccountKey=[^;]+/, 'AccountKey=null');
}

function fetchAccountName(connectionString) {
  return connectionString.match(/AccountName=[^;]+/)[0].split('=')[1];
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
  
    describe('share', function () {
      var shareName = 'storageclitest3';
      var quota = '10';
      describe('create', function () {
        it('should create a new share', function (done) {
          suite.execute('storage share create %s --quota %s --json', shareName, quota, function (result) {
            var share = JSON.parse(result.text);
            share.name.should.equal(shareName);
            share.quota.should.equal(quota);
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

      describe('set', function () {
        it('should set properties of the specified share', function (done) {
          quota = '20';
          suite.execute('storage share set %s --quota %s --json', shareName, quota, function (result) {
            var share = JSON.parse(result.text);
            share.name.should.equal(shareName);
            share.quota.should.equal(quota);
            done();
          });
        });
      });
      
      describe('show', function () {
        it('should show details of the specified share', function (done) {
          suite.execute('storage share show %s --json', shareName, function (result) {
            var share = JSON.parse(result.text);
            var usage = '0';
            share.name.should.equal(shareName);
            share.quota.should.equal(quota);
            share.shareUsage.should.equal(usage);
            done();
          });
        });
      });
      
      describe('stored access policy', function () {
        var policyName1 = 'sharepolicy01';
        var policyName2 = 'sharepolicy02';
        var start = new Date('2015-05-01').toISOString();
        var expiry = new Date('2099-12-31').toISOString();
        var permissions = 'rl';

        it('should create the share policy with read and list permission', function (done) {
          suite.execute('storage share policy create %s %s --permissions %s --start %s --expiry %s --json', shareName, policyName1, permissions, start, expiry, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);

            var found = false;
            for (var index in policies) {
              if (policies[index].Id === policyName1) {
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
            suite.execute('storage share policy show %s %s --json', shareName, policyName1, function (result) {
              var policies = JSON.parse(result.text);
              policies.length.should.greaterThan(0);

              var policy;
              for (var index in policies) {
                policy = policies[index];
                if (policy.Id === policyName1) {
                  break;
                }
              }

              policy.Id.should.equal(policyName1);
              policy.AccessPolicy.Permissions.should.equal(permissions);
              policy.AccessPolicy.Start.should.equal(start);
              policy.AccessPolicy.Expiry.should.equal(expiry);
              done();
            });
          }, aclTimeout);
        });

        it('should list the policies', function (done) {
          suite.execute('storage share policy create %s %s --permissions %s --start %s --expiry %s --json', shareName, policyName2, permissions, start, expiry, function (result) {
            setTimeout(function() {
              suite.execute('storage share policy list %s --json', shareName, function (result) {
                var policies = JSON.parse(result.text);
                policies.length.should.equal(2);
                done();
              });
            }, aclTimeout);
          });
        });

        it('should set the policy', function (done) {
          var newPermissions = 'rwdl';
          var newStart = new Date('2015-12-01').toISOString();
          var newExpiry = new Date('2100-12-31').toISOString();
          suite.execute('storage share policy set %s %s --permissions %s --start %s --expiry %s --json', shareName, policyName1, newPermissions, newStart, newExpiry, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);

            var policy;
            for (var index in policies) {
              policy = policies[index];
              if (policy.Id === policyName1) {
                break;
              }
            }
            policy.Id.should.equal(policyName1);
            policy.AccessPolicy.Permissions.should.equal(newPermissions);
            policy.AccessPolicy.Start.should.equal(newStart);
            policy.AccessPolicy.Expiry.should.equal(newExpiry);
            done();
          });
        });

        it('should delete the policy', function (done) {
          suite.execute('storage share policy delete %s %s --json', shareName, policyName1, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);
            done();
          });
        });
      });

      describe('sas', function () {
        it('should create the share sas with list permission and list blobs', function (done) {
          var start = new Date('2014-05-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage share sas create %s rl %s --start %s --json', shareName, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage file list %s -a %s --sas %s --json', shareName, account, sas.sas, function (listResult) {
                listResult.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
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
      
      describe('sas', function () {
        it('should list the files with sas', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage share sas create %s l %s --start %s --json', shareName, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage file list %s -a %s --sas %s --json', shareName, account, sas.sas, function (listResult) {
                var list = JSON.parse(listResult.text);
                list.files.length.should.equal(testCount + 1);
                list.directories.length.should.equal(1);
                listResult.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });

        it('should create the sas of the file and show the file', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage file sas create %s %s r %s --start %s --json', shareName, remoteFile, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage file download %s %s %s -a %s --sas %s --json', shareName, remoteFile, localFile, account, sas.sas, function (result) {
                  result.errorText.should.be.empty;
                  try { fs.unlinkSync(localFile); } catch (e) {}
                  done();
              });
            } else {
              done();
            }
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

      describe('copy', function () {
        var fileService;
        var blobService;

        var remoteFileName = 'toCopy';
        var localFileName = 'copytofile.tmp.txt';

        var destShare = 'testfilecopydestshare';
        var destDirectory = 'testfilecopydestdir';
        var destPath = destDirectory + '/' + remoteFileName;
        var sourceShare = 'testfilecopysourceshare';
        var sourceDirectory = 'testfilecopysourcedir';
        var sourcePath = sourceDirectory + '/' + remoteFileName;
        var sourceContainer = 'testfilecopysourcecontainer';
        var sourceBlob = 'testfilecopysourceblob';
        var sourceBlobInVDir = destDirectory + '/' + sourceBlob;

        it('should prepare the source file and blob', function(done) {
          fileService = storage.createFileService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          fileService.createShareIfNotExists(sourceShare, function () {
            fileService.createShareIfNotExists(destShare, function () {
              var buf = new Buffer('HelloWorld', 'utf8');
              var fd = fs.openSync(localFileName, 'w');
              fs.writeSync(fd, buf, 0, buf.length, 0);
              fileService.createDirectoryIfNotExists(sourceShare, sourceDirectory, function (error) {
                assert.equal(error, null);
                fileService.createDirectoryIfNotExists(destShare, destDirectory, function (error) {
                  assert.equal(error, null);
                  fileService.createFileFromLocalFile(sourceShare, sourceDirectory, remoteFileName, localFileName, function (error) {
                    assert.equal(error, null);
                    blobService.createContainerIfNotExists(sourceContainer, function (error) {
                      assert.equal(error, null);
                      blobService.createBlockBlobFromLocalFile(sourceContainer, sourceBlob, localFileName, function (error) {
                        assert.equal(error, null);
                         blobService.createBlockBlobFromLocalFile(sourceContainer, sourceBlobInVDir, localFileName, function (error) {
                          assert.equal(error, null);
                          fs.unlinkSync(localFileName);
                          done();   
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });

        it('should start to copy the file specified by SAS asynchronously', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage share sas create %s r %s --start %s --json', sourceShare, expiry, start, function (result) {
            var sourceSas = JSON.parse(result.text);
            sourceSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            suite.execute('storage share sas create %s w %s --json', destShare, expiry, function (result) {
              var destSas = JSON.parse(result.text);
              destSas.sas.should.not.be.empty;
              result.errorText.should.be.empty;
              
              if (!suite.isMocked) {
                var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
                suite.execute('storage file copy start --source-share %s --source-path %s -a %s --source-sas %s --dest-share %s --dest-path %s --dest-account-name %s --dest-sas %s -q --json', 
                  sourceShare, sourcePath, account, sourceSas.sas, destShare, destPath, account, destSas.sas, function (result) {
                  var copy = JSON.parse(result.text);
                  copy.copyId.length.should.greaterThan(0);
                  result.errorText.should.be.empty;
                  done();
                });
              } else {
                done();
              }
            })
          });
        });
        
        it('should start to copy the file specified by SAS starts with question mark', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage share sas create %s r %s --start %s --json', sourceShare, expiry, start, function (result) {
            var sourceSas = JSON.parse(result.text);
            sourceSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;
            
            suite.execute('storage share sas create %s w %s --json', destShare, expiry, function (result) {
              var destSas = JSON.parse(result.text);
              destSas.sas.should.not.be.empty;
              result.errorText.should.be.empty;
              
              if (!suite.isMocked) {
                var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
                sourceSas.sas = '?' + sourceSas.sas;
                destSas.sas = '?' + destSas.sas;
                suite.execute('storage file copy start --source-share %s --source-path %s -a %s --source-sas %s --dest-share %s --dest-path %s --dest-account-name %s --dest-sas %s -q --json', 
                  sourceShare, sourcePath, account, sourceSas.sas, destShare, destPath, account, destSas.sas, function (result) {
                  var copy = JSON.parse(result.text);
                  copy.copyId.length.should.greaterThan(0);
                  result.errorText.should.be.empty;
                  done();
                });
              } else {
                done();
              }
            })
          });
        });

        it('should show the copy status of the specified file with SAS', function (done) {
          var start = new Date('2014-10-01').toISOString();
          var expiry = new Date('2099-12-31').toISOString();
          suite.execute('storage share sas create %s r %s --start %s --json', destShare, expiry, start, function (result) {
            var destSas = JSON.parse(result.text);
            destSas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage file copy show --share %s --path %s -a %s --sas %s --json', destShare, destPath, account, destSas.sas, function (result) {
                var copy = JSON.parse(result.text);
                copy.copyId.length.should.greaterThan(0);
                result.errorText.should.be.empty;
                done();
              });
            } else {
              done();
            }
          });
        });

        it('should start to copy the file specified by URI asynchronously', function (done) {
          if (!suite.isMocked) {
            var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
            var start = new Date('2014-10-01').toISOString();
            var expiry = new Date('2099-12-31').toISOString();
            suite.execute('storage share sas create %s r %s --start %s --json', sourceShare, expiry, start, function (result) {
              var sourceSas = JSON.parse(result.text);
              sourceSas.sas.should.not.be.empty;

              var sourceUri = fileService.getUrl(sourceShare, sourceDirectory, remoteFileName, sourceSas.sas);
              suite.execute('storage file copy start %s --dest-share %s --dest-path %s -q --json', sourceUri, destShare, destPath, function (result) {
                var copy = JSON.parse(result.text);
                copy.copyId.length.should.greaterThan(0);
                result.errorText.should.be.empty;
                done();
              });
            });
          } else {
            done();
          }
        });
        
        it('should start to copy the file asynchronously, specifying share and directory for both source and destination', function (done) {
          suite.execute('storage file copy start --source-share %s --source-path %s --dest-share %s --dest-path %s -q --json', sourceShare, sourcePath, destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        var copyid;
        it('should show the copy status of the specified file in the destination directory', function (done) {
          suite.execute('storage file copy show --share %s --path %s --json', destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copyId;
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should stop the copy of the specified file in the destination directory', function (done) {
          suite.execute('storage file copy stop --share %s --path %s --copyid %s --json', destShare, destPath, copyid, function (result) {
            result.errorText.should.startWith('error: There is currently no pending copy operation');
            done();
          });
        });
        
        it('should show the copy status of the specified file', function (done) {
          suite.execute('storage file copy show --share %s --path %s --json', destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copyId;
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should stop the copy of the specified file', function (done) {
          suite.execute('storage file copy stop --share %s --path %s --copyid %s --json', destShare, destPath, copyid, function (result) {
            result.errorText.should.startWith('error: There is currently no pending copy operation');
            done();
          });
        });

        it('should start to copy a blob to the file by specifying the container and blob', function (done) {
          suite.execute('storage file copy start --source-container %s --source-blob %s --dest-share %s --dest-path %s -q --json', sourceContainer, sourceBlob, destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });

        it('should start to copy a blob to the file specified by the blob URI', function (done) {
          if (!suite.isMocked) {
            var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
            var start = new Date('2014-10-01').toISOString();
            var expiry = new Date('2099-12-31').toISOString();
            suite.execute('storage container sas create %s r %s --start %s --json', sourceContainer, expiry, start, function (result) {
              var sourceSas = JSON.parse(result.text);
              sourceSas.sas.should.not.be.empty;
              var sourceUri = blobService.getUrl(sourceContainer, sourceBlob, sourceSas.sas);
              suite.execute('storage file copy start %s --dest-share %s --dest-path %s -q --json', sourceUri, destShare, destPath, function (result) {
                var copy = JSON.parse(result.text);
                copy.copyId.length.should.greaterThan(0);
                result.errorText.should.be.empty;
                done();
              });
            });
          } else {
            done();
          }
        });

        it('should show the copy status of the specified blob to the file', function (done) {
          suite.execute('storage file copy show --share %s --path %s --json', destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copyId;
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        it('should stop the copy of the specified blob to the file', function (done) {
          suite.execute('storage file copy stop --share %s --path %s --copyid %s --json', destShare, destPath, copyid, function (result) {
            result.errorText.should.startWith('error: There is currently no pending copy operation');
            done();
          });
        });

        it('should start to copy a blob in a virtual directory to the file by specifying the container and blob', function (done) {
          suite.execute('storage file copy start --source-container %s --source-blob %s --dest-share %s --dest-path %s -q --json', sourceContainer, sourceBlobInVDir, destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });

        it('should show the copy status of the specified blob in the virtual directory to the file', function (done) {
          suite.execute('storage file copy show --share %s --path %s --json', destShare, destPath, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copyId;
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });

        it('should cleanup the test file and blob', function(done) {
          fileService.deleteShare(sourceShare, function (error) {
            assert.equal(error, null);
            fileService.deleteShare(destShare, function (error) {
              assert.equal(error, null);
              blobService.deleteContainer(sourceContainer, function (error) {
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
