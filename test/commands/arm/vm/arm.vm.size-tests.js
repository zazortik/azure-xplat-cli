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

'use strict';

//var should = require('should');

var should = require('should');
var util = require('util');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-sizes-tests';
var groupPrefix = 'xplatTestGSz';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];
var groupName,
	vmPrefix = 'xplatvmSz',
	nicName = 'xplattestnicSz',
	location,
	username = 'azureuser',
	password = 'Brillio@2015' ,
	storageAccount = 'xplatteststoragsz',
	storageCont= 'xplatteststoragecntsz',
	osdiskvhd= 'xplattestvhdsz',	
	vNetPrefix = 'xplattestvnetsz',
	subnetName = 'xplattestsubnetsz',
	publicipName= 'xplattestipsz',
	dnsPrefix = 'xplattestdnssz' ,
	vmsize = 'Standard_A1',
	vmImage='bd507d3a70934695bc2128e3e5a255ba__RightImage-Windows-2008R2-SP1-x64-v5.8.8.11';
	
describe('arm', function () {
	describe('compute', function () {
	
		var suite, retry = 5;

		before(function (done) {
		  suite = new CLITest(this, testprefix, requiredEnvironment);
		  suite.setupSuite(function() {		  
				  location = process.env.AZURE_VM_TEST_LOCATION;
				  
				  groupName =  suite.isMocked ? 'xplatTestGSz' : suite.generateId(groupPrefix, null);	  
				  vmPrefix = suite.isMocked ? 'xplatvmSz' : suite.generateId(vmPrefix, null);
				  nicName = suite.isMocked ? 'xplattestnicSz' : suite.generateId(nicName, null);
				  storageAccount = suite.generateId(storageAccount, null);
				  storageCont = suite.generateId(storageCont, null);
				  osdiskvhd = suite.isMocked ? 'xplattestvhdsz' : suite.generateId(osdiskvhd, null);
				  vNetPrefix = suite.isMocked ? 'xplattestvnetSz' : suite.generateId(vNetPrefix, null);	
				  subnetName = suite.isMocked ? 'xplattestsubnetSz' : suite.generateId(subnetName, null);
				  publicipName = suite.isMocked ? 'xplattestipSz' : suite.generateId(publicipName, null);
				  dnsPrefix = suite.isMocked ? 'xplattestdnssz' : suite.generateId(dnsPrefix, null);
				 				  
				  done();
		  });
		});

		after(function (done) {
			deleteUsedGroup(function() {
				suite.teardownSuite(done);
			});			
		});

		beforeEach(function (done) {
		  suite.setupTest(done);
		});

		afterEach(function (done) {
		  suite.teardownTest(done);
		});

		describe('vm', function () {
				it('create for vm sizes should pass', function (done) {
					createGroup(function(){
						var cmd = util.format('vm create %s %s %s Windows -f %s -q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -z %s --json', 
									groupName, vmPrefix, location, nicName,vmImage, username, password, storageAccount, storageCont, 
									vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, vmsize).split(' ');
						testUtils.executeCommand(suite, retry, cmd, function (result) {
							result.exitStatus.should.equal(0);
							done();
						});
					});
				});
				it('sizes should list available virtual machine sizes for the previous created VM', function (done) {
					suite.execute('vm sizes -g %s -n %s --json',groupName, vmPrefix, function (result) {
						result.exitStatus.should.equal(0);
						var allResources = JSON.parse(result.text);
						allResources.some(function (res) {
							return res.name === vmsize;
						}).should.be.true;
						done();
					});
				});
				
				it('sizes should list VM sizes available in given location ', function (done) {
					suite.execute('vm sizes -l %s --json', location, function (result) {
						result.exitStatus.should.equal(0);
						var allResources = JSON.parse(result.text);
						allResources.some(function (res) {
							return res.name === vmsize;
						}).should.be.true;
						done();
					});
				});
							
				
					
		  
		});
	
		function createGroup(callback) {
			suite.execute('group create %s --location %s --json', groupName,location, function (result) {
			  result.exitStatus.should.equal(0);
			  callback();
			});
		}
		
		function deleteUsedGroup(callback) {
			if(!suite.isPlayback()) {
				suite.execute('group delete %s --quiet --json', groupName, function (result) {
				  result.exitStatus.should.equal(0);
				  callback();
				});
			} else callback();
		}
	});
});