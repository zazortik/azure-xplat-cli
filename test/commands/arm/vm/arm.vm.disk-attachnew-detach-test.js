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
var testUtil = require('../../../util/util');
var testprefix = 'arm-cli-vm-disk-attachnew-detach-tests';
var groupPrefix = 'xplatTestGCreateDisk';
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
var createdDisks = [];

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

var groupName, timeout,
	vmPrefix = 'xplattestvmDk',
	nicName = 'xplattestnicDk',
	location,
	//os = 'Windows',
	username = 'azureuser',
	password = 'Brillio@2015' ,
	//VMImage = 'ad072bd3082149369c449ba5832401ae__Windows-Server-Remote-Desktop-Session-Host-on-Windows-Server-2012-R2-20140514-1852',
	storageAccount = 'xplatteststorage',
	storageCont= 'xplatteststoragecnt',
	osdiskvhd= 'xplattestvhdDk',	
	vNetPrefix = 'xplattestvnetDk',
	subnetName = 'xplattestsubnetDk',
	publicipName= 'xplattestipDk',
	dnsPrefix = 'xplattestipdnsdk',
	diskPrefix = 'xplatdiskdk';

describe('arm', function () {
	describe('compute', function () {
	
		var suite, retry = 5;
		testUtil.TIMEOUT_INTERVAL = 5000;

		before(function (done) {
		  suite = new CLITest(testprefix, requiredEnvironment);
		  suite.setupSuite(function() {	
			  location = process.env.AZURE_VM_TEST_LOCATION;
			  timeout = suite.isMocked ? 0 : testUtil.TIMEOUT_INTERVAL;		  
			  groupName =  suite.isMocked ? 'xplatTestGCreateDisk' : suite.generateId(groupPrefix, null);	  
			  vmPrefix = suite.isMocked ? 'xplattestvmDk' : suite.generateId(vmPrefix, null);
			  nicName = suite.isMocked ? 'xplattestnicDk' : suite.generateId(nicName, null);
			  storageAccount = suite.isMocked ? 'xplatteststoragedk' : suite.generateId(storageAccount, null);
			  storageCont = suite.isMocked ? 'xplatteststoragecntdk' : suite.generateId(storageCont, null);
			  osdiskvhd = suite.isMocked ? 'xplattestvhddk' : suite.generateId(osdiskvhd, null);
			  vNetPrefix = suite.isMocked ? 'xplattestvnetDk' : suite.generateId(vNetPrefix, null);	
			  subnetName = suite.isMocked ? 'xplattestsubnetDk' : suite.generateId(subnetName, null);
			  publicipName = suite.isMocked ? 'xplattestipDk' : suite.generateId(publicipName, null);
			  dnsPrefix = suite.isMocked ? 'xplattestipdnsdk' : suite.generateId(dnsPrefix, null);
			  
			  diskPrefix = suite.isMocked ? 'xplatdiskdk' : suite.generateId(diskPrefix, null);
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
			it('create for disk attach and detach', function (done) {
				createGroup(function(){
					var cmd = util.format('vm create %s %s eastus Windows -f %s -u %s -p %s -o %s -R %s -c %s -d %s -F %s -P %s -j %s -k %s -i %s -w %s --json', 
							groupName, vmPrefix, nicName, username, password, storageAccount, 
							storageCont, 'None', osdiskvhd+'.vhd', vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24',
							publicipName, dnsPrefix).split(' ');
								
					suite.execute(cmd,  function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
					
		it('disk attachnew', function(done) {
		  diskPrefix = diskPrefix + '.vhd';
          var cmd = util.format('vm disk attach-new %s %s 1 %s --json', groupName, vmPrefix, diskPrefix).split(' ');
          testUtil.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
			done();
          });
      });
	  
	  // VM Restart
      it('disk detach', function(done) {
        var cmd = util.format('vm disk detach %s %s 0 --json', groupName, vmPrefix).split(' ');
        testUtil.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
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
				//suite.execute('vm delete %s %s --quiet', groupName,vmPrefix, function (result) {
				//result.exitStatus.should.equal(0);
				if(!suite.isPlayback()) {
					suite.execute('group delete %s --quiet', groupName, function (result) {
						result.exitStatus.should.equal(0);
						callback();
					});
				} else callback();
			//});
			
			
		}
	});
});