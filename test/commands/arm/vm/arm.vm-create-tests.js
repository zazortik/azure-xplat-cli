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

var should = require('should');
var util = require('util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-create-tests';
var groupPrefix = 'xplatTestGVMCreate';
var createdGroups = [];
var createdVms = [];
var createdNics = [];
var createdStorages = [];
var createdStrgcnts = [];
var createdVhds = [];
var createdVnets = [];
var createdSubnets = [];
var createdIps = [];
var createdDns = [];
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

var groupName,
	vmPrefix = 'xplattestvm',
	nicName = 'xplattestnic',
	location,
	username = 'azureuser',
	password = 'Brillio@2015',
	storageAccount = 'xplatteststorage1',
	storageCont= 'xplatteststoragecnt1',
	osdiskvhd= 'xplattestvhd',	
	vNetPrefix = 'xplattestvnet',
	subnetName = 'xplattestsubnet',
	publicipName= 'xplattestip',
	dnsPrefix = 'xplattestipdns' ;

describe('arm', function () {
	describe('compute', function () {
	
		var suite;

		before(function (done) {
		  suite = new CLITest(testprefix, requiredEnvironment);
		  suite.setupSuite(function() {		  
			  location = process.env.AZURE_VM_TEST_LOCATION;
			  groupName =  suite.isMocked ? 'xplatTestGVMCreate' : suite.generateId(groupPrefix, null);	  
			  vmPrefix = suite.isMocked ? 'xplattestvm' : suite.generateId(vmPrefix, null);
			  nicName = suite.isMocked ? 'xplattestnic' : suite.generateId(nicName, null);
			  //storageAccount = suite.isMocked ? 'xplatteststorage1' : suite.generateId(storageAccount, null);
			  //storageCont = suite.isMocked ? 'xplatteststoragecnt1' : suite.generateId(storageCont, null);
			  storageAccount = suite.generateId(storageAccount, null);
			  storageCont = suite.generateId(storageCont, null);
			  osdiskvhd = suite.isMocked ? 'xplattestvhd' : suite.generateId(osdiskvhd, null);
			  vNetPrefix = suite.isMocked ? 'xplattestvnet' : suite.generateId(vNetPrefix, null);	
			  subnetName = suite.isMocked ? 'xplattestsubnet' : suite.generateId(subnetName, null);
			  publicipName = suite.isMocked ? 'xplattestip' : suite.generateId(publicipName, null);
			  dnsPrefix = suite.isMocked ? 'xplattestipdns' : suite.generateId(dnsPrefix, null);		  
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
					it('create', function (done) {
						createGroup(function(){
							var cmd = util.format('vm create %s %s %s Windows -f %s -u %s -p %s -o %s -R %s -c %s -d %s -F %s -P %s -j %s -k %s -i %s -w %s --json', 
										groupName, vmPrefix, location, nicName, username, password, storageAccount, 
										storageCont, 'None', osdiskvhd+'.vhd', vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24',
										publicipName, dnsPrefix).split(' ');
										
							suite.execute(cmd,  function (result) {
								result.exitStatus.should.equal(0);
								done();
							});
						});
					});
			
			
			
					it('list', function (done) {
							suite.execute('vm list %s --json',groupName,function (result) {
								  result.exitStatus.should.equal(0);
								  var allResources = JSON.parse(result.text);
									allResources.some(function (res) {
										return res.name === vmPrefix;
									}).should.be.true;
								  done();
							});					
					});
				
				
					it('show', function (done) {
						suite.execute('vm show %s %s --json', groupName, vmPrefix , function (result) {
							result.exitStatus.should.equal(0);  
							var allResources = JSON.parse(result.text);
							allResources.name.should.equal(vmPrefix);
							done();
						});
					});
					
					it('get instance view', function (done) {
						suite.execute('vm show %s %s --json', groupName, vmPrefix , function (result) {
							result.exitStatus.should.equal(0);  
							//var allResources = JSON.parse(result.text);
							//allResources.name.should.equal(vmPrefix);
							done();
						});
					});
				
					// it('delete', function (done) {
						// suite.execute('vm delete  %s %s --quiet', groupName,vmPrefix, function (result) {
							// result.exitStatus.should.equal(0);
							// done();
						// });
					// });
			
		  
		});
	
		function createGroup(callback) {
			suite.execute('group create %s --location %s --json', groupName,location, function (result) {
			  result.exitStatus.should.equal(0);
			  callback();
			});
		}
	
		function deleteUsedGroup(callback) {
			if(! suite.isPlayback()) {
				suite.execute('group delete %s --quiet', groupName, function (result) {
				  result.exitStatus.should.equal(0);
				  callback();
				});
			} else callback();
		}
	});
});