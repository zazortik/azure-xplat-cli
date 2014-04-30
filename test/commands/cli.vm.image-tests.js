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

var storageAccountKey = process.env['AZURE_STORAGE_ACCESS_KEY'] ? process.env['AZURE_STORAGE_ACCESS_KEY'] : 'YW55IGNhcm5hbCBwbGVhc3VyZQ==';
var createdDisks = [];

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
var testPrefix = 'cli.vm.image-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmImgName = 'xplattestimg', location = process.env.AZURE_VM_TEST_LOCATION || 'West US';

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

    describe('Image: ', function () {
      // Image Create
      it('Create', function (done) {
		getDiskName('Linux', function(diskObj){
			var imageSourcePath = diskObj.MediaLink;
            var domainUrl = 'http://' + imageSourcePath.split('/')[2];
			var blobUrl = domainUrl + '/vm-images/' + vmImgName;
			
			suite.execute('vm image create -u %s %s %s --os %s -l %s --json', blobUrl, vmImgName, imageSourcePath, 'Linux', location, function (result) {
				result.exitStatus.should.equal(0);
				setTimeout(done, timeout);
			});
		});
      });
	  
		it('Show', function (done) {
			suite.execute('vm image show %s --json', vmImgName, function (result) {
				var vmImageObj = JSON.parse(result.text);
				vmImageObj.Name.should.equal(vmImgName);
				vmImageObj.OS.should.equal('Linux');
				done();
			});
		});
		
		it('List', function (done) {
			suite.execute('vm image list --json', function (result) {
				result.exitStatus.should.equal(0);
				var imageList = JSON.parse(result.text);
				imageList.length.should.be.above(0);
				done();
			});
		});
	});

    describe('Image: ', function () {
      // Image delete
      it('Delete', function (done) {
        suite.execute('vm image delete -b %s --json', vmImgName, function (result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

    // Get name of an disk of the given category
    function getDiskName(OS, callBack) {
      suite.execute('vm disk list --json', function (result) {
        var diskList = JSON.parse(result.text);
        diskList.some(function (disk) {
			if (disk.OS.toLowerCase() == OS.toLowerCase())
				diskObj = disk;
				return diskObj;
		});
        callBack(diskObj);
      });
    }
  });
});
