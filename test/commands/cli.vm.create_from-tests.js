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

// A common VM used by multiple tests
var vmToUse = {
  Name : null,
  Created : false,
  Delete : false
};

var vmPrefix = 'clitestvm';
var timeout = isForceMocked ? 0 : 5000;

var suite;
var testPrefix = 'cli.vm.create_from-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var location = process.env.AZURE_VM_TEST_LOCATION || 'West US',
    vmName,
    file = 'vminfo.json';

    before(function (done) {
      suite = new CLITest(testPrefix, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }
      
      vmName = process.env.TEST_VM_NAME;
      suite.setupSuite(done);
    });

    after(function (done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }
      suite.teardownSuite(done);
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

    //create a vm from role file
    describe('Create:', function () {
      it('Create-from a file', function (done) {
        var Fileresult = fs.readFileSync(file, 'utf8');
        var obj = JSON.parse(Fileresult);
        obj['RoleName'] = vmName;
        var diskName = obj.oSVirtualHardDisk.name;
        waitForDiskRelease(diskName, function () {
          var jsonstr = JSON.stringify(obj);
          fs.writeFileSync(file, jsonstr);
          suite.execute('vm create-from %s %s --json -l %s', vmName, file, location, function (result) {
            result.exitStatus.should.equal(0);
            fs.unlinkSync('vminfo.json');
            vmToUse.Name = vmName;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            done();
          });
        });
      });
    });

    //check if disk is released from vm and then if released call callback or else wait till it is released
    function waitForDiskRelease(vmDisk, callback) {
      var vmDiskObj;
      suite.execute('vm disk show %s --json', vmDisk, function (result) {
        vmDiskObj = JSON.parse(result.text);
        if (vmDiskObj.usageDetails && vmDiskObj.usageDetails.deploymentName) {
          setTimeout(function () {
            waitForDiskRelease(vmDisk, callback);
          }, 10000);
        } else {
          callback();
        }
      });
    }

  });
});
