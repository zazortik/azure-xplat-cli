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
var vmNames = [];
var timeout = isForceMocked ? 0 : 30000;

var suite;
var testPrefix = 'cli.vm.create_win_rdp-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var location = process.env.AZURE_VM_TEST_LOCATION || 'West US',
    vmName,
    vmImgName;

    before(function (done) {
      suite = new CLITest(testPrefix, isForceMocked);
      
      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }
      
      process.env.TEST_VM_NAME = isForceMocked ? 'xplattestvm' : suite.generateId(vmPrefix, null);
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
            var cmd = util.format('vm delete %s -b -q --json', vm.Name).split(' ');
            suite.execute(cmd, function (result) {
              vm.Name = null;
              vm.Created = vm.Delete = false;
              setTimeout(callback, timeout);
            });
          }, timeout);
        } else {
          callback();
        }
      }

      deleteUsedVM(vmToUse, function () {
        suite.teardownTest(done);
      });
    });

    //create a vm with windows image
    describe('Create:', function () {
      it('Windows Vm', function (done) {
        getImageName('Windows', function (ImageName) {
          var cmd = util.format('vm create -r %s %s %s azureuser PassW0rd$ -l %s --json',
              '3389', vmName, ImageName, 'someLoc').split(' ');
          cmd[9] = location;
          suite.execute(cmd, function (result) {
            setTimeout(done, timeout);
          });
        });
      });
    });

    //create a vm with connect option
    describe('Create:', function () {
      it('with Connect', function (done) {
        var vmConnect = vmName + '-2';
        var cmd = util.format('vm create -l %s --connect %s %s azureuser PassW0rd$ --json',
            'someLoc', vmName, vmImgName).split(' ');
        cmd[3] = location;
        suite.execute(cmd, function (result) {
          result.exitStatus.should.equal(0);
          vmToUse.Name = vmConnect;
          vmToUse.Created = true;
          vmToUse.Delete = true;
          done();
        });
      });
    });

    // Negative Test Case by specifying VM Name Twice
    describe('Negative test case:', function () {
      it('Specifying Vm Name Twice', function (done) {
        suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
          vmName, vmImgName, location, function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.include('A VM with dns prefix "' + vmName + '" already exists');
          done();
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      var cmd = util.format('vm image list --json').split(' ');
      suite.execute(cmd, function (result) {
        var imageList = JSON.parse(result.text);
        imageList.some(function (image) {
          if (image.operatingSystemType.toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            vmImgName = image.name;
          }
        });
        callBack(vmImgName);
      });
    }
  });
});
