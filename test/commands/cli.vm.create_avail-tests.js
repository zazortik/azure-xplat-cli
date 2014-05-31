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
var testPrefix = 'cli.vm.create_avail-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var location = process.env.AZURE_VM_TEST_LOCATION || 'West US', vmName = 'xplattestvm', availSetName = 'Testset';

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

    describe('Vm Create: ', function () {
       // Create VM using availability set
      it('Availability set', function (done) {
        getImageName('Linux', function (ImageName) {
          suite.execute('vm create -A %s -n %s -l %s %s %s "azureuser" "Pa$$word@123" --json',
            'Testset', vmName, location, vmName, ImageName, function (result) {
              suite.execute('vm show %s --json', vmName, function (result) {
                var vmConnectName = JSON.parse(result.text);
                vmConnectName.VMName.should.equal(vmName);
                createdDisks.push(vmConnectName.OSDisk.DiskName);
				  vmToUse.Name = vmName;
				  vmToUse.Created = true;
				  vmToUse.Delete = true;
                setTimeout(done, timeout);
              });
            });
        });
      });
    });
	
	 // Get name of an image of the given category
    function getImageName(category, callBack) {
      suite.execute('vm image list --json', function (result) {
        var imageList = JSON.parse(result.text);
        imageList.some(function (image) {
          if (image.OS.toLowerCase() === category.toLowerCase() && image.Category.toLowerCase() === 'public') {
            getImageName.ImageName = image.Name;
            //location = image.Location.split(';')[0];
          }
        });
        callBack(getImageName.ImageName);
      });
    }
	
  });
});