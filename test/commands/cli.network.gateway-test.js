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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var testprefix = 'cli.network.gateway-test';
var networkTestUtil = require('../util/asmNetworkTestUtil');

var vnetPrefix1 = 'CliGtTestVnet', vnetAddrSpace1 = '10.1.0.0', vnetCidr1 = '16', subnetStartIp1 = '10.1.0.0', subnetCidr1 = '19';	
var subnetPrefix1 = 'GatewaySubnet', subnetAddPrefix1 = '10.1.32.0/29';	
var locNetPrefix2 = 'CliGtTestLocNetwork', vpnGatewayAddress2 = '200.200.200.200', LocNetAddressPrefix2 = '10.2.0.0/16';
var type = 'DynamicRouting' , sku = 'Default', KeyValue= 'abcd', KeyLength = '123', vendor, platform, osFamily ;
var location, storagePrefix = 'clivpnstorage' , accountType , storageContPrefix = 'clivpncont', duration = '300'; 
var requiredEnvironment = [
    { name: 'AZURE_VM_TEST_LOCATION', defaultValue: 'West US' },
	{ name: 'AZURE_STORAGE_TEST_TYPE', defaultValue: 'LRS' },
	];


describe('asm', function () {
    describe('network', function () {
		var suite, timeout, retry = 5 ;
		testUtils.TIMEOUT_INTERVAL = 10000;
		var networkUtil = new networkTestUtil();

		before(function (done) {
		    suite = new CLITest(this, testprefix, requiredEnvironment);
		    suite.setupSuite(function() {
				location = process.env.AZURE_VM_TEST_LOCATION;
				timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
				accountType = process.env.AZURE_STORAGE_TEST_TYPE;
				vnetPrefix1 = suite.generateId(vnetPrefix1, null);
				locNetPrefix2 = suite.generateId(locNetPrefix2, null);
				storagePrefix = suite.generateId(storagePrefix, null);
				storageContPrefix = suite.generateId(storageContPrefix, null);
			    done();
		    });
		});
		after(function(done) {
			networkUtil.removeLocalNetwork(vnetPrefix1, locNetPrefix2, timeout, suite, function() {
				networkUtil.deleteGatewayVnet(vnetPrefix1, timeout, suite, function() {
					networkUtil.deleteStorage(storagePrefix, timeout, suite, function() {
						networkUtil.deleteLocalNetwork(locNetPrefix2, timeout, suite, function() {
							suite.teardownSuite(done);
						});
					});
				});
			});				
		});
		
		beforeEach(function(done) {
			suite.setupTest(done);	
		});
		afterEach(function (done) {
		  suite.teardownTest(done);
		});

		describe('vpn-gateway', function () {
		
			it('create should pass', function (done) {
				this.timeout(networkUtil.timeout);
				networkUtil.createVnetForGateway(vnetPrefix1, vnetAddrSpace1, vnetCidr1, subnetStartIp1, subnetCidr1, location, timeout, suite, function() {
					networkUtil.createGatewaySubnet(vnetPrefix1, subnetPrefix1, subnetAddPrefix1, timeout, suite, function() {
						networkUtil.createLocalNetwork(locNetPrefix2, LocNetAddressPrefix2, vpnGatewayAddress2, timeout, suite, function() {
							networkUtil.addLocalNetwork(vnetPrefix1, locNetPrefix2, timeout, suite, function() {
								var cmd = util.format('network vpn-gateway create -n %s -t %s --json', vnetPrefix1, type).split(' ');
								testUtils.executeCommand(suite, retry, cmd, function (result) {
									result.exitStatus.should.equal(0);
									done();
								});
							});		
						});			
												
					});														
				});								
			});
			it('show should display details about gateway ', function (done) {
				var cmd = util.format('network vpn-gateway show %s --json', vnetPrefix1).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					allresources.gatewayType.should.equal("DynamicRouting");
					done();
				});
			});
			it('shared-key set', function (done) {
				var cmd = util.format('network vpn-gateway shared-key set -n %s -t %s -k %s --json', vnetPrefix1, locNetPrefix2, KeyValue).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('shared-key reset', function (done) {
				var cmd = util.format('network vpn-gateway shared-key reset -n %s -t %s -l %s --json', vnetPrefix1, locNetPrefix2, KeyLength).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('connection list', function (done) {
				var cmd = util.format('network vpn-gateway connection list %s --json', vnetPrefix1).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('vpn-device list', function (done) {
				var cmd = util.format('network vpn-gateway device list --json').split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					var allresources = JSON.parse(result.text);
					vendor = allresources[0].name;
					platform = allresources[0].platform;
					osFamily = allresources[0].os;
					done();
				});
			});
			//Blocked- https://github.com/MSOpenTech/azure-xplat-cli/issues/258
			// it('default-site set should pass', function (done) {
				// var cmd = util.format('network vpn-gateway default-site set %s %s --json', vnetPrefix1, locNetPrefix2).split(' ');
				// testUtils.executeCommand(suite, retry, cmd, function (result) {
					// result.exitStatus.should.equal(0);
					// done();
				// });
			// });
			// it('default-site remove should pass', function (done) {
				// var cmd = util.format('network vpn-gateway default-site remove %s --json', vnetPrefix1).split(' ');
				// testUtils.executeCommand(suite, retry, cmd, function (result) {
					// result.exitStatus.should.equal(0);
					// done();
				// });
			// });
			//Blocked - https://github.com/MSOpenTech/azure-xplat-cli/issues/264
			// it('vpn-device get-script', function (done) {
				// var cmd = util.format('network vpn-gateway device get-script -n %s -o %s -p %s -f %s --json', vnetPrefix1, vendor, platform, osFamily).split(' ');
				// testUtils.executeCommand(suite, retry, cmd, function (result) {
					// result.exitStatus.should.equal(0);
					// done();
				// });
			// });
			//Blocked- https://github.com/MSOpenTech/azure-xplat-cli/issues/244
			// it('resize should resize gateway in a vnet', function (done) {
				// var cmd = util.format('network vpn-gateway resize %s %s --json', vnetPrefix1, sku).split(' ');
				// testUtils.executeCommand(suite, retry, cmd, function (result) {
					// result.exitStatus.should.equal(0);
					// done();
				// });
			// });
			//Blocked- https://github.com/MSOpenTech/azure-xplat-cli/issues/243
			// it('reset should reset gateway in a vnet', function (done) {
				// var cmd = util.format('network vpn-gateway reset %s --json', vnetPrefix1).split(' ');
				// testUtils.executeCommand(suite, retry, cmd, function (result) {
					// result.exitStatus.should.equal(0);
					// done();
				// });
			// });
			it('diagnostics start should pass', function (done) {
				networkUtil.createStorage(storagePrefix, location, accountType, timeout, suite, function() {
					networkUtil.listStorageKey(storagePrefix, timeout, suite, function(primaryKey) {
						networkUtil.createStorageCont(storageContPrefix, storagePrefix, primaryKey, timeout, suite, function() {
							var cmd = util.format('network vpn-gateway diagnostics start %s -d %s -a %s -k %s -c %s --json', vnetPrefix1, duration, storagePrefix, primaryKey, storageContPrefix).split(' ');
							testUtils.executeCommand(suite, retry, cmd, function (result) {
								result.exitStatus.should.equal(0);
								done();
							});
						});	
					});		
				});		
			});
			it('diagnostics stop should pass', function (done) {
				var cmd = util.format('network vpn-gateway diagnostics stop %s --json', vnetPrefix1).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});

			it('diagnostics get should pass', function (done) {
				var cmd = util.format('network vpn-gateway diagnostics get %s --json', vnetPrefix1).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
			it('delete should delete gateway from vnet', function (done) {
				this.timeout(networkUtil.timeout);
				var cmd = util.format('network vpn-gateway delete %s --quiet --json', vnetPrefix1).split(' ');
				testUtils.executeCommand(suite, retry, cmd, function (result) {
					result.exitStatus.should.equal(0);
					done();
				});
			});
	 		  
		});
	});
});
