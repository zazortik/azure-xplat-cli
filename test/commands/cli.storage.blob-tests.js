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
var should = require('should');
var fs = require('fs');
var util = require('util');
var assert = require('assert');
var azureCommon = require('azure-common');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;

var testPrefix = 'cli.storage.blob-tests';
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
  describe('storage', function() {

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
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

        it('should create the container policy with list permission', function (done) {
          suite.execute('storage container policy create %s %s --permissions %s --start %s --expiry %s --json', containerName, policyName1, permissions, start, expiry, function (result) {
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
          suite.execute('storage container policy show %s %s --json', containerName, policyName1, function (result) {
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
        });

        it('should list the policies', function (done) {
          suite.execute('storage container policy create %s %s --permissions %s --start %s --expiry %s --json', containerName, policyName2, permissions, start, expiry, function (result) {
            suite.execute('storage container policy list %s --json', containerName, function (result) {
              var policies = JSON.parse(result.text);
              policies.length.should.equal(2);
              done();
            });
          });
        });

        it('should set the policy', function (done) {
          var newPermissions = 'rwdl';
          var newStart = new Date('2015-12-01').toISOString();
          var newExpiry = new Date('2100-12-31').toISOString();
          suite.execute('storage container policy set %s %s --permissions %s --start %s --expiry %s --json', containerName, policyName1, newPermissions, newStart, newExpiry, function (result) {
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
          suite.execute('storage container policy delete %s %s --json', containerName, policyName1, function (result) {
            var policies = JSON.parse(result.text);
            policies.length.should.greaterThan(0);
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

      describe('delete', function() {
        it('should delete the specified container', function(done) {
          suite.execute('storage container delete %s -q --json', containerName, function(result) {
            done();
          });
        });
      });
    });

    //Skip for pending investigation for failures on node 0.8, "Error: timeout of 500000ms exceeded"
    describe.skip('blob', function() {
      var containerName = 'storage-cli-blob-test';
      var blobName = 'blobname';
      before(function(done) {
        var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        blobService.createContainer(containerName, function(){done();});
      });

      after(function(done) {
        var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
        blobService.deleteContainer(containerName, function(){done();});
      });
      
      describe('upload', function () {
        it('should upload a basic file to azure storage', function (done) {
          var buf = new Buffer('HelloWord', 'utf8');
          var fileName = 'hello.tmp.txt';
          var fd = fs.openSync(fileName, 'w');
          fs.writeSync(fd, buf, 0, buf.length, 0);
          var md5Hash = crypto.createHash('md5');
          md5Hash.update(buf);
          var contentMD5 = md5Hash.digest('base64');
          suite.execute('storage blob upload %s %s %s --json', fileName, containerName, blobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.blob.should.equal(blobName);
            blob.contentMD5.should.equal(contentMD5);
            fs.unlinkSync(fileName);
            done();
          });
        });
      });
      
      describe('list', function () {
        it('should list all blobs', function (done) {
          suite.execute('storage blob list %s --json', containerName, function (result) {
            var blobs = JSON.parse(result.text);
            blobs.length.should.greaterThan(0);
            blobs.some(function (blob) {
              return blob.name === blobName;
            }).should.be.true;
            done();
          });
        });
      });
      
      describe('show', function () {
        it('should show specified blob', function (done) {
          suite.execute('storage blob show %s %s --json', containerName, blobName, function (result) {
            var blob = JSON.parse(result.text);
            blob.blob.should.equal(blobName);
            done();
          });
        });
      });
      
      describe('download', function () {
        it('should download the specified blob', function (done) {
          var fileName = 'hello.download.txt';
          suite.execute('storage blob download %s %s %s -q -m --json', containerName, blobName, fileName, function (result) {
            var blob = JSON.parse(result.text);
            blob.blob.should.equal(blobName);
            blob.fileName.should.equal(fileName);
            fs.unlinkSync(fileName);
            done();
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
                blob.length.should.equal(1);
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
          suite.execute('storage blob sas create %s %s rw %s --start %s --json', containerName, blobName, expiry, start, function (result) {
            var sas = JSON.parse(result.text);
            sas.sas.should.not.be.empty;
            result.errorText.should.be.empty;

            if (!suite.isMocked) {
              var account = fetchAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING);
              suite.execute('storage blob show %s %s -a %s --sas %s --json', containerName, blobName, account, sas.sas, function (showResult) {
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
        it('should delete the specified blob', function (done) {
          suite.execute('storage blob delete %s %s --json', containerName, blobName, function (result) {
            result.errorText.should.be.empty;
            done();
          });
        });
      });
      
      describe('copy', function () {
        var destContainer = 'testblobcopydest';
        var sourceContainer = 'testblobcopysource';
        var blobName = 'toCopy';
        var fileName = 'copy.tmp.txt'; 

        before(function(done) {
          var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          blobService.createContainer(sourceContainer, function () {
              blobService.createContainer(destContainer, function () {
                var buf = new Buffer('HelloWord', 'utf8');
                var fd = fs.openSync(fileName, 'w');
                fs.writeSync(fd, buf, 0, buf.length, 0);
                blobService.createBlockBlobFromLocalFile(sourceContainer, blobName, fileName, function (err) {
                  fs.unlinkSync(fileName);
                  done();
                });
              });
            });
        });

        after(function(done) {
          var blobService = storage.createBlobService(process.env.AZURE_STORAGE_CONNECTION_STRING);
          blobService.deleteContainer(sourceContainer, function () {
            blobService.deleteContainer(destContainer, function () {
              done();
            });
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
                copy.copyId.length.should.greaterThan(0);
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

              var sourceUri = util.format('https://%s.blob.core.windows.net/%s/%s?%s', account, sourceContainer, blobName, sourceSas);
              suite.execute('storage blob copy start %s --dest-container %s -q --json', sourceUri, destContainer, function (result) {
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
        
        it('should start to copy the blob specified by container and blob name asynchronously', function (done) {
          suite.execute('storage blob copy start --source-container %s --source-blob %s --dest-container %s -q --json', sourceContainer, blobName, destContainer, function (result) {
            var copy = JSON.parse(result.text);
            copy.copyId.length.should.greaterThan(0);
            result.errorText.should.be.empty;
            done();
          });
        });
        
        var copyid;
        it('should show the copy status of the specified blob', function (done) {
          suite.execute('storage blob copy show --container %s --blob %s --json', destContainer, blobName, function (result) {
            var copy = JSON.parse(result.text);
            copyid = copy.copyId;
            copy.copyId.length.should.greaterThan(0);
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
      });
    });
  });
});
