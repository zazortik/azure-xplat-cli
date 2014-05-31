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
  Name: null,
  Created: false,
  Delete: false
};

var vmPrefix = 'clitestvm';
var vmNames = [];
var timeout = isForceMocked ? 0 : 120000;

var suite;
var testPrefix = 'cli.vm.create_win_rdp';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var location = process.env.AZURE_VM_TEST_LOCATION || 'West US', vmName, vmImgName;

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
	
	describe('Create: ', function(){
		// Creating a Windows VM
		  it('Creating Windows Vm', function (done) {
			getSharedVM(function (vm) {
			  vm.Created.should.be.ok;
			  setTimeout(done, timeout);
			});
		  });
	});
		
	describe('Create: ', function(){
	  //connect Vm
      it('Connect VM', function (done) {
        var vmConnect = vmName + '-2';
		  suite.execute('vm create -l %s --connect %s %s azureuser PassW0rd$ --json',
            location, vmName, vmImgName, function (result) {
              result.exitStatus.should.equal(0);
              vmToUse.Name = vmConnect;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              setTimeout(done, timeout);
          });
      });
	}); 
	
	describe('Delete: ', function(){
	  //connect Vm
      it('Windows vm', function (done) {
		  vmToUse.Name = vmName;
		  vmToUse.Created = true;
		  vmToUse.Delete = true;
		  setTimeout(done, timeout);
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
              vmImgName = image.Name;
            }
          });

          callBack(vmImgName);
        });
      }
    }


    // Create a VM to be used by multiple tests (this will be useful when we add more tests
    // for endpoint create/delete/update, vm create -c.
    function getSharedVM(callBack) {
      getImageName('Windows', function (imageName) {
        vmName = suite.generateId(vmPrefix, vmNames);
        suite.execute('vm create -r %s %s %s azureuser PassW0rd$ --json --location %s',
          '3389',
          vmName,
          imageName,
          location,
          function (result) {
            vmToUse.Created = (result.exitStatus === 0);
            vmToUse.Name = vmToUse.Created ? vmName : null;
            return callBack(vmToUse);
          });
      });
    }
  });
});