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
var vmPrefix = 'ClitestVm';
var testPrefix = 'cli.vm.capture-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: null
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      certFile,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      captureImg = 'xplattestcapimg',
      timeout, retry;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = suite.isMocked ? 'xplattestvm' : suite.generateId(vmPrefix, null);
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : 10000;
        certFile = process.env.SSHCERT;
        retry = 5;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //shutdown a vm
    describe('Vm:', function() {
      it('shutdown and capture', function(done) {
        createVM(function() {
          var cmd = util.format('vm shutdown %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            setTimeout(function() {
              cmd = util.format('vm capture %s %s --json --delete', vmName, captureImg).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                setTimeout(function() {
                  cmd = util.format('service delete %s -q --json', vmName, captureImg).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                }, timeout);
              });
            }, timeout);
          });
        });
      });
    });

    // VM Capture into a disk
    describe('Captured Images:', function() {
      it('should be listed in images list and delete', function(done) {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vmImagelist = JSON.parse(result.text);
          var imagefound = false;
          imagefound = vmImagelist.some(function(imageObj) {
            if (imageObj.name === captureImg) {
              return true;
            }
          });
          imagefound.should.true;
          setTimeout(function() {
            cmd = util.format('vm image delete -b %s --json', captureImg).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(done, timeout);
            });
          }, timeout);
        });
      });
    });

    function createVM(callback) {
      getImageName('Linux', function(imagename) {
        var cmd = util.format('vm create --ssh-cert %s %s %s %s %s --json', certFile, vmName, imagename, username, password).split(' ');
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
  });
});
