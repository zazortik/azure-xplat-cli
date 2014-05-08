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
var testPrefix = 'cli.vm.disk.show-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmName = 'xplattestvm', diskName = 'xplattestdisk', location = process.env.AZURE_VM_TEST_LOCATION || 'West US';
	var domainUrl, storageAccountKey = process.env['AZURE_STORAGE_ACCESS_KEY'] ? process.env['AZURE_STORAGE_ACCESS_KEY'] : 'YW55IGNhcm5hbCBwbGVhc3VyZQ==';

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
      suite.teardownTest(done);
    });

	describe('Create and List: ', function(){
		 it('List and Show Disk', function (done) {
			suite.execute('vm disk list --json', function (result) {
				result.exitStatus.should.equal(0);
				
				var diskList = JSON.parse(result.text);
				diskList.length.should.be.above(0);
				
				var diskName = ''
				diskList.some(function (disk) {
					if (disk.OS && disk.OS.toLowerCase() === 'linux') {
					  DiskName = disk.Name;
					}
				});

				suite.execute('vm disk show %s --json', DiskName, function (result) {
					 result.exitStatus.should.equal(0);
					 var disk = JSON.parse(result.text);
					 disk.Name.should.equal(DiskName);
					 diskSourcePath = disk.MediaLink;
					 domainUrl = 'http://' + diskSourcePath.split('/')[2];
					 setTimeout(done, 0);
				});
			});
		 });
	});
	
	describe('Create: ', function(){
		it('Disk', function(done){
			var blobUrl = domainUrl + '/disks/' + diskName;
			suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, location, blobUrl, function (result) {
			  suite.execute('vm disk show %s --json', diskName, function (result) {
				var diskObj = JSON.parse(result.text);
				diskObj.Name.should.equal(diskName);
				done();
			  });
			});
		});
		
		it('Create Vm (pre-requisite)', function (done) {
			getImageName('Linux', function (ImageName) {
				suite.execute('vm create -l %s %s %s "azureuser" "Pa$$word@123" --json', location, vmName, ImageName, function (result) {
					result.exitStatus.should.equal(0);
					setTimeout(done, timeout);
				});
			});
		});				
	});
	
	describe('Upload: ', function(){
		it('Disk', function(done){
			var sourcePath = suite.isMocked ? diskSourcePath : (process.env['BLOB_SOURCE_PATH'] || diskSourcePath);
			var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/' + suite.generateId(vmPrefix, null) + '.vhd';
			suite.execute('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey, function (result) {
			  result.exitStatus.should.equal(0);
			  done();
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
            }
          });

          callBack(getImageName.imageName);
        });
      }
    }
  });
});