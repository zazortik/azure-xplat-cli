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
var fs = require('fs')
var testUtils = require('../util/util');;
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'ClitestVm';
var createdVms = [];
var testPrefix = 'cli.vm.export_create_from-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      timeout,
      username = 'azureuser',
      password = 'PassW0rd$',
      diskreleasetimeout = 200000,
      file = 'vminfo.json',
      retry = 5;
    testUtils.TIMEOUT_INTERVAL = 5000;

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false,
      blobDelete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        diskreleasetimeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function(done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          var cmd = vm.blobDelete ?
            util.format('vm delete %s -b -q --json', vm.Name).split(' ') :
            util.format('vm delete %s -q --json', vm.Name).split(' ');
          setTimeout(function() {
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              vm.Name = null;
              vm.Created = vm.Delete = false;
              return callback();
            });
          }, timeout);
        } else {
          return callback();
        }
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownTest(done);
      });
    });

    //create a vm from role file
    describe('VM:', function() {
      it('export and delete', function(done) {
        ListDisk('Linux', function(diskObj) {
          createVM(function() {
            var domainUrl = 'http://' + diskObj.mediaLinkUri.split('/')[2];
            var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
            var cmd1 = util.format('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl).split(' ');
            testUtils.executeCommand(suite, retry, cmd1, function(innerresult) {
              innerresult.exitStatus.should.equal(0);
              var cmd = util.format('vm export %s %s  --json', vmName, file).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                fs.existsSync(file).should.equal(true);
                vmToUse.Delete = true;
                setTimeout(done, timeout);
              });
            });
          });
        });
      });

      it('Create-from a file', function(done) {
        checkFreeDisk(function(diskname) {
          var Fileresult = fs.readFileSync(file, 'utf8');
          var obj = JSON.parse(Fileresult);
          obj['RoleName'] = vmName;
          if (diskname)
            obj.oSVirtualHardDisk.name = diskname;
          else
            diskname = obj.oSVirtualHardDisk.name;

          waitForDiskRelease(diskname, function() {
            var jsonstr = JSON.stringify(obj);
            fs.writeFileSync(file, jsonstr);
            var cmd = util.format('vm create-from %s %s --json', vmName, file).split(' ');
            cmd.push('-l');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('vm show %s --json', obj['roleName']).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var vmObj = JSON.parse(result.text);
                vmObj.DataDisks[0].should.not.be.null;
                vmToUse.Name = vmName;
                vmToUse.Created = true;
                fs.unlinkSync('vminfo.json');
                vmToUse.Delete = true;
                vmToUse.blobDelete = true;
                setTimeout(done, timeout);
              });
            });
          });
        });
      });
    });

    function checkFreeDisk(callback) {
        var diskname;
        var cmd = util.format('vm disk list --json');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          vmDiskObj = JSON.parse(result.text);
          vmDiskObj.some(function(disk) {
            if (!disk.usageDetails && disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === 'linux') {
              diskname = disk.name;
              return true;
            }
          });
          callback(diskname);
        });
      }
      //check if disk is released from vm and then if released call callback or else wait till it is released

    function waitForDiskRelease(vmDisk, callback) {
      var vmDiskObj;
      var cmd = util.format('vm disk show %s --json', vmDisk).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        vmDiskObj = JSON.parse(result.text);
        if (vmDiskObj.usageDetails && vmDiskObj.usageDetails.deploymentName) {
          setTimeout(function() {
            waitForDiskRelease(vmDisk, callback);
          }, timeout);
        } else {
          setTimeout(function() {
            callback();
          }, diskreleasetimeout);
        }
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

    function createVM(callback) {
      getImageName('Linux', function(imagename) {
        var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
        cmd.push('-l');
        cmd.push(location);
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          vmToUse.Name = vmName;
          vmToUse.Created = true;
          setTimeout(callback, timeout);
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
  });
});
