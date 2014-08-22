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
var testPrefix = 'cli.vm.disk.attachnew-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      retry = 5;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      deleteUsedVM(function() {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = suite.isMocked ? 'XplattestVm' : suite.generateId(vmPrefix, null);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : 5000;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //attaches a new disk
    describe('Disk:', function() {
      it('Attach-New', function(done) {
        ListDisk('Linux', function(diskObj) {
          createVM(function() {
            var domainUrl = 'http://' + diskObj.mediaLinkUri.split('/')[2];
            var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
            var cmd = util.format('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              waitForDiskOp(vmName, true, function() {
                cmd = util.format('vm disk detach %s 0 --json', vmName).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  waitForDiskOp(vmName, false, done);
                });
              });
            });
          });
        });
      });
    });

    function waitForDiskOp(vmName, DiskAttach, callback) {
      var vmObj;
      var cmd = util.format('vm show %s --json', vmName).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        vmObj = JSON.parse(result.text);
        if ((!DiskAttach && !vmObj.DataDisks[0]) || (DiskAttach && vmObj.DataDisks[0])) {
          callback();
        } else {
          setTimeout(function() {
            waitForDiskOp(vmName, DiskAttach, callback);
          }, 10000);
        }
      });
    }

    function createVM(callback) {
      getImageName('Linux', function(imagename) {
        var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
        cmd.push('-l');
        cmd.push(location);
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(callback, timeout);
        });
      });
    }
    // Get name of an image of the given category

    function getImageName(category, callBack) {
      var cmd = util.format('vm image list --json').split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);
        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            vmImgName = image.name;
            return true;
          }
        });
        callBack(vmImgName);
      });
    }

    function ListDisk(OS, callback) {
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
        callback(diskObj);
      });
    }

    function deleteUsedVM(callback) {
      if (suite.isMocked)
        callback();
      else {
        var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
        setTimeout(function() {
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            return callback();
          });
        }, timeout);
      }
    }

  });
});
