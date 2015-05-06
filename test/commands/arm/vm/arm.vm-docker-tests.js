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
var path = require('path');
var fs = require('fs');

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
},{
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
	vmPrefix = 'xplatvmdocker',
	nicName = 'xplatnicdocker',
	location, homePath, timeout,
	username = 'azureuser',
	password = 'Brillio@2015',
	storageAccount = 'xplatstdocker',
	storageCont= 'xplatscntdocker',
	osdiskvhd= 'xplatdockervhd',	
	vNetPrefix = 'xplatdockervnet',
	subnetName = 'xplatdockersubnet',
	publicipName= 'xplatdockerip',
	dnsPrefix = 'xplatdockeripdns', 
	sshcert,
	vmImage='b39f27a8b8c64d52b05eac6a62ebad85__Ubuntu-14_04_1-LTS-amd64-server-20150123-en-us-30GB';

describe('arm', function () {
	describe('compute', function () {
		var suite, retry = 5, dockerCertDir,
		dockerCerts;
		testUtils.TIMEOUT_INTERVAL = 12000;
		before(function (done) {
				suite = new CLITest(this,testprefix, requiredEnvironment);
				suite.setupSuite(function() {		  
				location = process.env.AZURE_VM_TEST_LOCATION;
				groupName =  suite.isMocked ? 'xplatTestGVMDocker' : suite.generateId(groupPrefix, null);	  
				vmPrefix = suite.isMocked ? 'xplatvmdocker' : suite.generateId(vmPrefix, null);
				nicName = suite.isMocked ? 'xplatnicdocker' : suite.generateId(nicName, null);
				storageAccount = suite.generateId(storageAccount, null);
				storageCont = suite.generateId(storageCont, null);
				osdiskvhd = suite.isMocked ? 'xplatdockervhd' : suite.generateId(osdiskvhd, null);
				vNetPrefix = suite.isMocked ? 'xplatdockervnet' : suite.generateId(vNetPrefix, null);	
				subnetName = suite.isMocked ? 'xplatdockersubnet' : suite.generateId(subnetName, null);
				publicipName = suite.isMocked ? 'xplatdockerip' : suite.generateId(publicipName, null);
				dnsPrefix = suite.isMocked ? 'xplatdockeripdns' : suite.generateId(dnsPrefix, null);	
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;	
				homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
				sshcert =  process.env.SSHCERT;
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
					dockerCertDir = path.join(homePath, '.docker');
					var dockerPort = 4243;
					var cmd = util.format('vm docker create %s %s %s Linux -f %s -q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s -T %s -O %s --json', 
								groupName, vmPrefix, location, nicName,vmImage, username, password, storageAccount, storageCont, 
								vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert, dockerPort, dockerCertDir).split(' ');
					testUtils.executeCommand(suite, retry, cmd, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
			
			it('show should show created Docker VM', function (done) {
				var cmd = util.format('vm show %s %s --json',groupName, vmPrefix).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					  result.exitStatus.should.equal(0);
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
				deleteDockerCertificates();
				var cmd = util.format('group delete %s --quiet --json', groupName).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					callback();
				});
			} else callback();
		}
		function deleteDockerCertificates() {
        if (!dockerCertDir || !dockerCerts) {
          return;
        }

        fs.exists(dockerCertDir, function(exists) {
          if (!exists) {
            return;
          }

          fs.unlinkSync(dockerCerts.caKey);
          fs.unlinkSync(dockerCerts.ca);
          fs.unlinkSync(dockerCerts.serverKey);
          fs.unlinkSync(dockerCerts.server);
          fs.unlinkSync(dockerCerts.serverCert);
          fs.unlinkSync(dockerCerts.clientKey);
          fs.unlinkSync(dockerCerts.client);
          fs.unlinkSync(dockerCerts.clientCert);
          fs.unlinkSync(dockerCerts.extfile);
          fs.rmdirSync(dockerCertDir);
        });
      }
		
	});
});