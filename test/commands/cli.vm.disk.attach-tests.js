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
var timeout = isForceMocked ? 0 : 18000;

var suite;
var testPrefix = 'cli.vm.disk.attach-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmName = 'xplattestvm', diskName = 'xplattestdisk';

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

	   describe('Disk: ', function(){
			// Attach & Detach Disk		
			it('Attach & Detach disk', function (done) {
			suite.execute('vm disk attach %s %s --json', vmName, diskName, function (result) {
			  suite.execute('vm show %s --json', vmName, function (result) {
				var vmObj = JSON.parse(result.text);
				if(vmObj.DataDisks[0]){
					vmObj.DataDisks[0].DiskName.should.equal(diskName);
					suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
					  result.exitStatus.should.equal(0);
					  setTimeout(done, timeout);
					});
				}
				 else
					done();
			  });
			});
		  });
		  
		  // Attach-New
		  it('Attach-New', function (done) {
			suite.execute('vm disk show %s --json', diskName, function (result) {
				var diskDetails = JSON.parse(result.text);
				domainUrl = 'http://' + diskDetails.MediaLink.split('/')[2];
				var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
				suite.execute('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl, function (result) {
				  result.exitStatus.should.equal(0);
				  suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					setTimeout(done, timeout);
				  });
				});
			  });
		  });
	   });
   });
});