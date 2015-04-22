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
var testprefix = 'arm-cli-vm-extension-tests';
var groupPrefix = 'xplatTestGExtension';
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
	vmPrefix = 'xplatvmExt',
	nicName = 'xplattestnicExt',
	location,
	username = 'azureuser',
	password = 'Brillio@2015' ,
	storageAccount = 'xplatteststoragext',
	storageCont= 'xplatteststoragecntext',
	osdiskvhd= 'xplattestvhdext',	
	vNetPrefix = 'xplattestvnetExt',
	subnetName = 'xplattestsubnetExt',
	publicipName= 'xplattestipExt',
	dnsPrefix = 'xplattestdnsext' ,
	extension = 'VS14CTPDebugger' ,
	publisher = 'Microsoft.VisualStudio.Azure.RemoteDebug',
	version = '1.0',
	vmImage='ad072bd3082149369c449ba5832401ae__Windows-Server-RDSHwO365P-on-Windows-Server-2012-R2-20150128-0010';

describe('arm', function () {
	describe('compute', function () {
	
		var suite, retry = 5;

		before(function (done) {
		  suite = new CLITest(this, testprefix, requiredEnvironment);
		  suite.setupSuite(function() {		  
				  location = process.env.AZURE_VM_TEST_LOCATION;
				  
				  groupName =  suite.isMocked ? 'xplatTestGExtension' : suite.generateId(groupPrefix, null);	  
				  vmPrefix = suite.isMocked ? 'xplattestvmExt' : suite.generateId(vmPrefix, null);
				  nicName = suite.isMocked ? 'xplattestnicExt' : suite.generateId(nicName, null);
				  storageAccount = suite.generateId(storageAccount, null);
				  storageCont = suite.generateId(storageCont, null);
				  osdiskvhd = suite.isMocked ? 'xplattestvhdext' : suite.generateId(osdiskvhd, null);
				  vNetPrefix = suite.isMocked ? 'xplattestvnetExt' : suite.generateId(vNetPrefix, null);	
				  subnetName = suite.isMocked ? 'xplattestsubnetExt' : suite.generateId(subnetName, null);
				  publicipName = suite.isMocked ? 'xplattestipExt' : suite.generateId(publicipName, null);
				  dnsPrefix = suite.isMocked ? 'xplattestdnsext' : suite.generateId(dnsPrefix, null);
				 				  
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
				it('create for extension get and set ', function (done) {
					createGroup(function(){
						var cmd = util.format('vm create %s %s %s Windows -f %s -q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s --json', 
									groupName, vmPrefix, location, nicName,vmImage, username, password, storageAccount, storageCont,
									vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix).split(' ');
						testUtils.executeCommand(suite, retry, cmd, function (result) {
							result.exitStatus.should.equal(0);
							done();
						});
					});
				});
			
					 //Set extensions
					it('Set extensions for the created vm', function (done) {
						var cmd = util.format('vm extension set %s %s %s %s %s ',groupName,vmPrefix,extension,publisher,version).split(' ');
								testUtils.executeCommand(suite, retry, cmd, function (result) {
									result.exitStatus.should.equal(0);
									done();
								});
					});
					
					it('Extension Get should list all extensions', function (done) {
						var cmd = util.format('vm extension get %s %s --json',groupName,vmPrefix).split(' ');
						testUtils.executeCommand(suite, retry, cmd, function (result) {
							result.exitStatus.should.equal(0);
							var allResources = JSON.parse(result.text);
								allResources.some(function (res) {
								return res.extension === extension;
							}).should.be.true;
							
							done();
						});						
					});
					
					it('Uninstall the set extension', function (done) {
						var cmd = util.format('vm extension set %s %s  %s %s %s -u --json',groupName,vmPrefix,extension,publisher,version).split(' ');
						testUtils.executeCommand(suite, retry, cmd, function (result) {
							result.exitStatus.should.equal(0);
							cmd = util.format('vm extension get %s %s --json',groupName,vmPrefix).split(' ');
							testUtils.executeCommand(suite, retry, cmd, function(checkresult) {
								var exts = JSON.parse(checkresult.text);
								var found = false;
								found = exts.some(function(ext) {
								  if (extensionname === ext.name)
									return true;
								});
								found.should.be.false;
								done();
							});
							
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
				suite.execute('group delete %s --quiet', groupName, function (result) {
				  result.exitStatus.should.equal(0);
				  callback();
				});
			} else callback();
		}
	});
});