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
var testPrefix = 'cli.vm.disk.attachDetach-tests';

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
      diskName,
      timeout, retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;

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
        diskName = vmName + 'disk';
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //attach a disk and if successfull detaches the attached disk
    describe('Disk:', function() {
      it('Attach & Detach', function(done) {
        createDisk(function() {
          createVM(function() {
            var cmd = util.format('vm disk attach %s %s --json', vmName, diskName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              waitForDiskOp(vmName, true, function(vmObj) {
                vmObj.DataDisks[0].name.should.equal(diskName);
                cmd = util.format('vm disk detach %s 0 --json', vmName).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  waitForDiskOp(vmName, false, function(vmObj) {
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    //check if disk is attached or de attached and then call the callback
    function waitForDiskOp(vmName, DiskAttach, callback) {
      var vmObj;
      var cmd = util.format('vm show %s --json', vmName).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        vmObj = JSON.parse(result.text);
        if ((!DiskAttach && !vmObj.DataDisks[0]) || (DiskAttach && vmObj.DataDisks[0])) {
          callback(vmObj);
        } else {
          setTimeout(function() {
            waitForDiskOp(vmName, DiskAttach, callback);
          }, timeout);
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

    function createDisk(callback) {
      getDiskName('Linux', function(diskObj) {
        var diskSourcePath = diskObj.mediaLinkUri;
        var domainUrl = 'http://' + diskSourcePath.split('/')[2];
        var blobUrl = domainUrl + '/disks/' + diskName;
        var cmd = util.format('vm disk create %s %s -u %s --json', diskName, diskSourcePath, blobUrl).split(' ');
        cmd.push('-l');
        cmd.push(location);
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          callback();
        });
      });
    }

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (process.env.VM_LINUX_IMAGE) {
        callBack(process.env.VM_LINUX_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function(image) {
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_LINUX_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_LINUX_IMAGE);
        });
      }
    }

    // Get name of an disk of the given category
    function getDiskName(OS, callBack) {
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

    function deleteDisk(callback) {
      if (suite.isMocked)
        callback();
      else {
        var cmd = util.format('vm disk delete %s -b --json', diskName).split(' ');
        setTimeout(function() {
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            return callback();
          });
        }, timeout);
      }
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