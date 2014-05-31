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
var testPrefix = 'cli.vm.create_affin_vnet-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var location = process.env.AZURE_VM_TEST_LOCATION || 'West US', affinLabel = 'XplatAffinGrp', affinDesc = 'Test Affinty Group for xplat',
	affinityName = 'xplattestaffingrp', vmName = 'xplattestvm', vmVnetName = 'xplattestvmVnet', vnetName='xplattestvnet';

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

    describe('Create: ', function () {
		  //Create affinitygroup and associate affinity group to VM
		  it('Affinity group', function (done) {
			suite.execute('account affinity-group create -l %s -e %s -d %s %s --json',
			  location, affinLabel , affinDesc, affinityName, function (result) {
				result.exitStatus.should.equal(0);
				setTimeout(done, timeout);
			  });
		  });
	  
	  // Assigning a VM to a Virtual Network
		it('Virtual network', function (done) {
			suite.execute('network vnet create %s -l %s --json', vnetName, location, function (result) {
				result.exitStatus.should.equal(0);
				setTimeout(done, timeout);
			});
		});
	});
	
	describe('Create: ', function(){
		it('Vm with vnet', function(done){
			getImageName('Linux', function(imageName){
				suite.execute('vm create --virtual-network-name %s -l %s %s %s "azureuser" "Pa$$word@123" --json', 
					vnetName, location, vmVnetName, imageName , function(result){
						result.exitStatus.should.equal(0);
					vmToUse.Created = true;
					vmToUse.Name = vmVnetName;
					vmToUse.Delete = true;
					setTimeout(done, timeout);
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
            }
          });

          callBack(getImageName.imageName);
        });
      }
    }
  });
});