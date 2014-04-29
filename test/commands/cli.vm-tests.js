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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var communityImageId = isForceMocked ? 'vmdepot-1-1-1' : process.env['AZURE_COMMUNITY_IMAGE_ID'];
var createdDisks = [];

// A common VM used by multiple tests
var vmToUse = {
  Name: null,
  Created: false,
  Delete: false
};

var vmPrefix = 'clitestvm';
var vmNames = [];
var timeout = isForceMocked ? 0 : 12000;

var suite;
var testPrefix = 'cli.vm-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmName = 'xplattestvm';
    var vmImgName, location, vmComName;

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

    describe('Create with different Options: ', function () {
      // Create a VM
      it('Create and List VM', function (done) {
        // get list of all vms
        // create a vm with dnsname(vmName) and imagename(vmImgName)
        getImageName('Linux', function (ImageName) {
          vmImgName = ImageName;
          suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
            vmName, vmImgName, location, function (result) {
              // check if vm is created
              // get list of all vms and then check if vmName is present in VMList
              suite.execute('vm list --json', function (result) {
                var vmList = JSON.parse(result.text);

                // Look for created VM
                var vmExists = vmList.some(function (vm) {
                  return vm.VMName.toLowerCase() === vmName.toLowerCase();
                });
                vmExists.should.be.ok;
                setTimeout(done, timeout);
              });
            });
        });
      });

      //Create vmw with custom data
      it('Create vm with custom data', function (done) {
        var customVmName = vmName + 'customdata';
        var fileName = 'customdata';
        var certFile = process.env['SSHCERT'] || 'test/data/fakeSshcert.pem';
        generateFile(fileName, null, 'nodejs,python,wordpress');
        suite.execute('vm create -e %s -z %s --ssh-cert %s --no-ssh-password %s %s testuser Collabera@01 -l %s -d %s --json --verbose',
          '223', 'small', certFile, customVmName, vmImgName, location, fileName, function (result) {
            if (result.exitStatus == 1)
              done(result.errorText, null);
            var verboseString = result.text;
            var iPosCustom = verboseString.indexOf('CustomData:');
            iPosCustom.should.equal(-1);
            fs.unlink(fileName, function (err) {
              vmToUse.Name = customVmName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
      });

      // create vm from a community image
      it('Should create from community image', function (done) {
        vmComName = suite.generateId(vmPrefix, vmNames);

        // Create a VM using community image (-o option)
        suite.execute('vm create %s %s communityUser PassW0rd$ -o --json --ssh --location %s',
          vmComName, communityImageId, location,
          function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
      });
    });

    describe('Vm Operations: ', function () {

      //location list
      it('Location List', function (done) {
        suite.execute('vm location list --json', function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.empty;
          done();
        });
      });

      // Export a VM
      it('Export a VM', function (done) {
        var file = 'vminfo.json';
        suite.execute('vm export %s %s  --json', vmName, file, function (result) {
          result.exitStatus.should.equal(0);
          if (fs.exists) {
            fs.exists(file, function (result) {
              result.should.be.true;
              // this file will be deleted in 'create-from a VM' method
              done();
            });
          } else {
            path.exists(file, function (result) {
              result.should.be.true;
              // this file will be deleted in 'create-from a VM' method
              done();
            });
          }
        });
      });

      //connect Vm
      it('Connect a VM', function (done) {
        var vmConnect = vmName + '-2';
        suite.execute('vm create -l %s --connect %s %s "azureuser" "Pa$$word@123" --json',
          location, vmName, vmImgName, function (result) {
            suite.execute('vm show %s --json', vmConnect, function (result) {
              if (result.exitStatus == 1)
                done(result.errorText, null);
              result.exitStatus.should.equal(0);
              var vmConnectName = JSON.parse(result.text);
              vmConnectName.VMName.should.equal(vmConnect);
              createdDisks.push(vmConnectName.OSDisk.DiskName);
              vmToUse.Name = vmConnectName.VMName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
            });
          });
      });

      // VM shutdown
      it('VM Shutdown and start', function (done) {
        suite.execute('vm shutdown %s --json', vmComName, function (result) {
          if (result.exitStatus == 1)
            done(result.errorText, null);
          result.exitStatus.should.equal(0);
          suite.execute('vm start %s --json', vmComName, function (result) {
            if (result.exitStatus == 1)
              done(result.errorText, null);
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      // VM Restart
      it('VM Restart', function (done) {
        suite.execute('vm restart  %s --json', vmName, function (result) {
          if (result.exitStatus == 1)
            done(result.errorText, null);
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

    describe('Vm Negative Testcases: ', function () {
      // Negative Test Case by specifying VM Name Twice
      it('Negative test case by specifying Vm Name Twice', function (done) {
        var vmNegName = vmName;
        suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
          vmNegName, vmImgName, location, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('A VM with dns prefix "xplattestvm" already exists');
            done();
          });
      });

      // Create VM with custom data with large file as customdata file
      it('negative testcase for custom data - Large File', function (done) {
        var customVmName = vmName + 'customdatalargefile';
        var fileName = 'customdatalargefile';
        generateFile(fileName, 70000, null);
        suite.execute('vm create %s %s testuser Collabera@01 -l %s -d %s --json',
          customVmName, vmImgName, location, fileName, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('Input custom data file exceeded the maximum length of 65535 bytes');
            fs.unlink(fileName, function (err) {
              done();
            });
          });
      });

      // Negative Test Case by specifying invalid Password
      it('Negative test case for password', function (done) {
        var vmNegName = 'TestImg';
        suite.execute('vm create %s %s "azureuser" "Coll" --json --location %s',
          vmNegName, vmImgName, location, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('password must be atleast 8 character in length, it must contain a lower case, an upper case, a number and a special character');
            done();
          });
      });

      // Negative Test Case for Vm Create with Invalid Name
      it('Negative Test Case for Vm Create', function (done) {
        var vmNegName = 'test1@1';
        suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
          vmNegName, vmImgName, location, function (result) {
            // check the error code for error
            result.exitStatus.should.equal(1);
            result.errorText.should.include('The hosted service name is invalid.');
            done();
          });
      });

      // Negative Test Case by specifying invalid Location
      it('Negative Test Case for Vm create Location', function (done) {
        var vmNegName = 'newTestImg';
        suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
          vmNegName, vmImgName, 'SomeLoc', function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include(' No location found which has DisplayName or Name same as value of --location');
            done();
          });
      });
    });

    describe('Vm CleanUp: ', function () {

      // Delete a VM
      it('Delete VM', function (done) {
        suite.execute('vm delete %s --json --quiet', vmName, function (result) {
          suite.execute('vm show %s --json', vmName, function (result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('No VMs found');
            setTimeout(done, timeout);
          });
        });
      });

      // VM Capture
      it('VM capture', function (done) {
        suite.execute('vm shutdown %s --json', vmComName, function (result) {
          suite.execute('vm capture %s %s %s --json --delete', vmComName, 'caputured_Image', function (result) {
            if (result.exitStatus == 1)
              done(result.errorText, null);
            result.exitStatus.should.equal(0);
            suite.execute('vm image delete -b %s --json', 'caputured_Image', function (result) {
              setTimeout(done, timeout);
            });
          });
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (getImageName.imageName) {
        callBack(getImageName.imageName);
      } else {
        suite.execute('vm image list --json', function (result) {
          var imageList = JSON.parse(result.text);
          imageList.some(function (image) {
            if (image.OS.toLowerCase() === category.toLowerCase() && image.Category.toLowerCase() === 'public') {
              getImageName.imageName = image.Name;
              location = image.Location.split(';')[0];
            }
          });

          callBack(getImageName.imageName);
        });
      }
    }

    //create a file and write desired data given as input
    function generateFile(filename, fileSizeinBytes, data) {
      if (fileSizeinBytes)
        data = testUtils.generateRandomString(fileSizeinBytes);
      fs.writeFileSync(filename, data);
    }
  });
});