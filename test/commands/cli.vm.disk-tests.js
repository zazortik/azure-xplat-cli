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

var suite;
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.disk-tests';
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
    var diskSourcePath,
      storageAccountKey, timeout, retry = 5;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        storageAccountKey = process.env.AZURE_STORAGE_ACCESS_KEY
        timeout = suite.isMocked ? 0 : 5000;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //list and show the disk
    describe('Disk:', function() {
      it('List and Show', function(done) {
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

      it('show vm disk', function(done) {
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
      it('create and delete', function(done) {
        var diskName = suite.isMocked ? 'xplatestdisk' : suite.generateId(vmPrefix, null) + 'disk';
        getDiskName('Linux', function(diskObj) {
          diskSourcePath = diskObj.mediaLinkUri;
          var domainUrl = 'http://' + diskSourcePath.split('/')[2];
          var blobUrl = domainUrl + '/disks/' + diskName;
          var cmd = util.format('vm disk create %s %s -u %s --json', diskName, diskSourcePath, blobUrl).split(' ');
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

      it('Upload', function(done) {
        var sourcePath = suite.isMocked ? diskSourcePath : (process.env.BLOB_SOURCE_PATH || diskSourcePath);
        var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/' + suite.generateId(vmPrefix, null) + '.vhd';
        var cmd = util.format('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    // Get name of an disk of the given category
    function getDiskName(OS, callBack) {
      var diskObj;
      var cmd = util.format('vm disk list --json').split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
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
