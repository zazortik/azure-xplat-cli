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
var timeout = isForceMocked ? 0 : 5000;
var vmPrefix = 'clitestvm';
var suite;
var testPrefix = 'cli.vm.disk.create_upload-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'AZURE_STORAGE_ACCESS_KEY',
  defaultValue: null
}, {
  name: 'BLOB_SOURCE_PATH',
  defaultValue: null
}];
var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {
    var diskName = 'xplattestdisk',
      diskObj,
      diskSourcePath,
      location,
      storageAccountKey;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function() {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
    });

    after(function(done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }

      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        storageAccountKey = process.env.AZURE_STORAGE_ACCESS_KEY;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //create a disk
    describe('Disk:', function() {
      it('Create', function(done) {
        getDiskName('Linux', function(diskObj) {
          diskSourcePath = diskObj.mediaLinkUri;
          var domainUrl = 'http://' + diskSourcePath.split('/')[2];
          var blobUrl = domainUrl + '/disks/' + diskName;
          suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, location, blobUrl, function(result) {
            result.exitStatus.should.equal(0);
            suite.execute('vm disk show %s --json', diskName, function(result) {
              result.exitStatus.should.equal(0);
              var diskObj = JSON.parse(result.text);
              diskObj.name.should.equal(diskName);
              setTimeout(done, timeout);
            });
          });
        });
      });
    });

    describe('Disk:', function() {
      it('Upload', function(done) {
        var sourcePath = suite.isMocked ? diskSourcePath : (process.env.BLOB_SOURCE_PATH || diskSourcePath);
        var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/' + suite.generateId(vmPrefix, null) + '.vhd';
        suite.execute('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    // Get name of an disk of the given category
    function getDiskName(OS, callBack) {
      suite.execute('vm disk list --json', function(result) {
        result.exitStatus.should.equal(0);
        var diskList = JSON.parse(result.text);
        diskList.some(function(disk) {
          if ((disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === OS.toLowerCase()) &&
            (disk.location && disk.location.toLowerCase() === location.toLowerCase())) {
            diskObj = disk;
            return true;
          }
        });
        callBack(diskObj);
      });
    }
  });
});