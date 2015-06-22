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
var util = require('util');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'clitestvm';
var diskPrefix = 'clitestdisk'
var testPrefix = 'cli.vm.disk-tests';
var createdDisks = [];
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

describe('cli', function() {
  describe('vm', function() {
    var vmUtil = new vmTestUtil();
    var diskSourcePath,
      storageAccountKey, timeout, retry = 5;
    testUtils.TIMEOUT_INTERVAL = 5000;

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        storageAccountKey = process.env.AZURE_STORAGE_ACCESS_KEY;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //list and show the disk
    describe('Disk list and show', function() {
      it('should work', function(done) {
        var cmd = util.format('vm disk list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var diskList = JSON.parse(result.text);
          diskList.length.should.be.above(0);
          var diskName = '';
          diskList.some(function(disk) {
            if (disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === 'linux') {
              diskName = disk.name;
            }
          });

          cmd = util.format('vm disk show %s --json', diskName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var disk = JSON.parse(result.text);
            disk.name.should.equal(diskName);
            done();
          });
        });
      });

      it('should filter by vm name', function(done) {
        var diskName, vmname;
        var cmd = util.format('vm list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vmlist = JSON.parse(result.text);
          vmlist.some(function(vm) {
            if (vm.OSDisk) {
              diskName = vm.OSDisk.name;
              vmname = vm.VMName
              return true;
            }
          });
          cmd = util.format('vm disk list %s --json', vmname).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var diskObj = JSON.parse(result.text);
            diskObj[0].name.should.equal(diskName);
            done();
          });
        });
      });
    });

    //create and delete
    describe('Disk:', function() {
      it('create and delete should work', function(done) {
        var diskName = suite.generateId(diskPrefix, createdDisks);
        var osType = 'Linux';
        vmUtil.getDiskName(osType, location, suite, function(diskObj) {
          diskSourcePath = diskObj.mediaLinkUri;
          var domainUrl = 'https://' + diskSourcePath.split('/')[2];
          var blobUrl = domainUrl + '/disks/' + diskName;
          var cmd = util.format('vm disk create %s %s -u %s -o %s --json', diskName, diskSourcePath, blobUrl, osType).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm disk show %s --json', diskName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var diskObj = JSON.parse(result.text);
              diskObj.name.should.equal(diskName);
              setTimeout(function() {
                cmd = util.format('vm disk delete -b %s --json', diskName).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  setTimeout(done, timeout);
                });
              }, timeout);
            });
          });
        });
      });

      it('Upload should work', function(done) {
        var sourcePath = suite.isMocked ? diskSourcePath : (process.env.BLOB_SOURCE_PATH || diskSourcePath);
        var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/' + suite.generateId(vmPrefix, null) + '.vhd';
        var cmd = util.format('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

  });
});
