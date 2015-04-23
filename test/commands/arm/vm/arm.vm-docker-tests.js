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
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-docker-tests';
var groupPrefix = 'xplatTestGVMDocker';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

var groupName,
	vmPrefix = 'xplattestvmdocker',
	nicName = 'xplattestnicdocker',
	location,
	username = 'azureuser',
	password = 'Brillio@2015',
	storageAccount = 'xplatteststoragedocker',
	storageCont= 'xplatteststoragecntdocker',
	osdiskvhd= 'xplattestdockervhd',	
	vNetPrefix = 'xplattestdockervnet',
	subnetName = 'xplattestdockersubnet',
	publicipName= 'xplattestdockerip',
	dnsPrefix = 'xplattestdockeripdns', 
	sshcert = 'myCert.pem',
	vmImage='b39f27a8b8c64d52b05eac6a62ebad85__Ubuntu-14_04-LTS-amd64-server-20140724-en-us-30GB';

describe('arm', function () {
	describe('compute', function () {
		var suite, retry = 5;

		before(function (done) {
				suite = new CLITest(testprefix, requiredEnvironment);
				suite.setupSuite(function() {		  
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName =  suite.isMocked ? 'xplatTestGVMDocker' : suite.generateId(groupPrefix, null);	  
				vmPrefix = suite.isMocked ? 'xplattestvmdocker' : suite.generateId(vmPrefix, null);
				nicName = suite.isMocked ? 'xplattestnicdocker' : suite.generateId(nicName, null);
				storageAccount = suite.generateId(storageAccount, null);
				storageCont = suite.generateId(storageCont, null);
				osdiskvhd = suite.isMocked ? 'xplattestdockervhd' : suite.generateId(osdiskvhd, null);
				vNetPrefix = suite.isMocked ? 'xplattestdockervnet' : suite.generateId(vNetPrefix, null);	
				subnetName = suite.isMocked ? 'xplattestdockersubnet' : suite.generateId(subnetName, null);
				publicipName = suite.isMocked ? 'xplattestdockerip' : suite.generateId(publicipName, null);
				dnsPrefix = suite.isMocked ? 'xplattestdockeripdns' : suite.generateId(dnsPrefix, null);		  
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
		
			it('docker create should pass', function (done) {
				createGroup(function(){
					var cmd = util.format('vm docker create %s %s %s Linux -f %s -q %s -u %s -p %s -o %s -R %s -c %s -d %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --json', 
								groupName, vmPrefix, location, nicName,vmImage, username, password, storageAccount, storageCont, 'None', osdiskvhd+'.vhd', 
								vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
			
			it('list', function (done) {
				var cmd = util.format('vm list %s --json',groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					  result.exitStatus.should.equal(0);
					  var allResources = JSON.parse(result.text);
						allResources.some(function (res) {
							return res.name === vmPrefix;
						}).should.be.true;
					  done();
				});					
			});
			
		});
	
		function createGroup(callback) {
			var cmd = util.format('group create %s --location %s --json', groupName,location).split(' ');
			testUtils.executeCommand(suite, retry, cmd, function (result) {
			  result.exitStatus.should.equal(0);
			  callback();
			});
		}
		function deleteUsedGroup(callback) {
			if(!suite.isPlayback()) {
				var cmd = util.format('group delete %s --quiet', groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			} else callback();
		}
		
	});
});