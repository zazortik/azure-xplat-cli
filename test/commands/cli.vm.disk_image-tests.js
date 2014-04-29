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
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;

var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');

var storageAccountKey = process.env['AZURE_STORAGE_ACCESS_KEY'] ? process.env['AZURE_STORAGE_ACCESS_KEY'] : 'YW55IGNhcm5hbCBwbGVhc3VyZQ==';
var createdDisks = [];

// A common VM used by multiple tests
var vmToUse = {
  Name: null,
  Created: false,
  Delete: false
};

var vmPrefix = 'clitestvm';
var vmNames = [];
var timeout = isForceMocked ? 0 : 120000;

var suite;
var testPrefix = 'cli.vm.disk_image-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmImgName = 'xplattestimg1';
    var vmName = 'xplattestvm1';
    var diskName = 'xplattestdisk1';
    var diskSourcePath,
      domainUrl,
      imageSourcePath,
      location;

    before(function (done) {
      suite = new CLITest(testPrefix, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
    });

    after(function (done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
        suite.teardownSuite(done);
      } else {
        (function deleteUsedDisk() {
          if (createdDisks.length > 0) {
            var diskName = createdDisks.pop();
            setTimeout(function () {
              suite.execute('vm disk delete -b %s --json', diskName, function (result) {
                deleteUsedDisk();
              });
            }, timeout);
          } else {
            suite.teardownSuite(done);
          }
        })();
      }
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          setTimeout(function () {
            suite.execute('vm delete %s -b --quiet --json', vm.Name, function (result) {
              vm.Name = null;
              vm.Created = vm.Delete = false;
              return callback();
            });
          }, timeout);
        } else {
          return callback();
        }
      }

      deleteUsedVM(vmToUse, function () {
        suite.teardownTest(done);
      });
    });

    describe('Create and List: ', function () {
      // List Disk
      it('List and Show Disk', function (done) {
        suite.execute('vm disk list --json', function (result) {
          result.exitStatus.should.equal(0);
          var diskList = JSON.parse(result.text);
          diskList.length.should.be.above(0);
          var DiskName = '';
          for (var diskObj in diskList) {
            if (diskList[diskObj].OS.toLowerCase() == 'linux') {
              DiskName = diskList[diskObj].Name;
              break;
            }
          }
          suite.execute('vm disk show %s --json', DiskName, function (result) {
            result.exitStatus.should.equal(0);
            var diskDetails = JSON.parse(result.text);
            diskSourcePath = diskDetails.MediaLink;
            domainUrl = 'http://' + diskSourcePath.split('/')[2];
            location = diskDetails.Location;
            done();
          });
        });
      });

      // Create Disk
      it('Create Disk', function (done) {
        var blobUrl = domainUrl + '/disks/' + diskName;
        suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, location, blobUrl, function (result) {
          suite.execute('vm disk show %s --json', diskName, function (result) {
            if (result.exitStatus == 1)
              done(result.errorText, null);
            result.exitStatus.should.equal(0);
            var diskObj = JSON.parse(result.text);
            diskObj.Name.should.equal(diskName);
            imageSourcePath = diskObj.MediaLink;
            setTimeout(done, timeout);
          });
        });
      });

      // Image Create
      it('Image Create', function (done) {
        var blobUrl = domainUrl + '/vm-images/' + vmImgName;
        suite.execute('vm image create -u %s %s %s --os %s -l %s --json', blobUrl, vmImgName, imageSourcePath, 'Linux', location, function (result) {
          suite.execute('vm image show %s --json', vmImgName, function (result) {
            if (result.exitStatus == 1)
              done(result.errorText, null);
            var vmImageObj = JSON.parse(result.text);
            vmImageObj.Name.should.equal(vmImgName);
            vmImageObj.OS.should.equal('Linux');
            vmImageObj.MediaLink.should.equal(blobUrl);
            setTimeout(done, timeout);
          });
        });
      });

      // Create VM using availability set
      it('Availability set', function (done) {
        getImageName('Linux', function (ImageName) {
          suite.execute('vm create -A %s -n %s -l %s %s %s "azureuser" "Pa$$word@123" --json',
            'Testset', vmName, location, vmName, ImageName, function (result) {
              suite.execute('vm show %s --json', vmName, function (result) {
                if (result.exitStatus == 1)
                  done(result.errorText, null);
                var vmConnectName = JSON.parse(result.text);
                vmConnectName.VMName.should.equal(vmName);
                createdDisks.push(vmConnectName.OSDisk.DiskName);
                setTimeout(done, timeout);
              });
            });
        });
      });
    });

    describe('Disk Operations: ', function () {

      // Attach & Detach Disk		
      it('Attach & Detach disk', function (done) {
        suite.execute('vm disk attach %s %s --json', vmName, diskName, function (result) {
          suite.execute('vm show %s --json', vmName, function (result) {
            var vmObj = JSON.parse(result.text);
            vmObj.DataDisks[0].DiskName.should.equal(diskName);
            createdDisks.push(vmObj.OSDisk.DiskName);
            suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
              if (result.exitStatus == 1)
                done(result.errorText, null);
              result.exitStatus.should.equal(0);
              setTimeout(done, timeout);
            });
          });
        });
      });

      // Attach-New
      it('Attach-New', function (done) {
        var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
        suite.execute('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
            if (result.exitStatus == 1)
              done(result.errorText, null);
            result.exitStatus.should.equal(0);
            setTimeout(done, timeout);
          });
        });
      });

      // Vm disk list for a VM
      it('Vm disk List for a VM', function (done) {
        suite.execute('vm disk list %s --json', vmName, function (result) {
          if (result.exitStatus == 1)
            done(result.errorText, null);
          result.exitStatus.should.equal(0);
          var diskInfo = JSON.parse(result.text);
          diskInfo[0].DiskName.should.include(vmName);
          diskInfo[0].SourceImageName.should.equal('xplattestimg1');
          vmToUse.Name = vmName;
          vmToUse.Created = true;
          vmToUse.Delete = true;
          done();
        });
      });

      // upload disk
      it('Should verify upload disk', function (done) {
        var sourcePath = suite.isMocked ? diskSourcePath : (process.env['BLOB_SOURCE_PATH'] || diskSourcePath);
        var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/' + suite.generateId(vmPrefix, null) + '.vhd';
        suite.execute('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey, function (result) {
          if (result.exitStatus == 1)
            done(result.errorText, null);
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

    describe('Clean up: ', function () {
      this.timeout(60000);
      // Image delete
      it('Image Delete', function (done) {
        suite.execute('vm image delete -b %s --json', vmImgName, function (result) {
          if (result.exitStatus == 1)
            done(result.errorText, null);
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });

      // Delete Disk
      it('Delete disk', function (done) {
        suite.execute('vm disk delete -b %s --json', diskName, function (result) {
          if (result.exitStatus == 1)
            done(result.errorText, null);
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      suite.execute('vm image list --json', function (result) {
        var imageList = JSON.parse(result.text);
        imageList.some(function (image) {
          if (image.OS.toLowerCase() === category.toLowerCase() && image.Category.toLowerCase() === 'public') {
            getImageName.ImageName = image.Name;
            //location = image.Location.split(';')[0];
          }
        });
        callBack(getImageName.ImageName);
      });
    }
  });
});