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
var async = require('async');
var path = require('path');
var fs = require('fs');
var util = require('util');
var testUtils = require('../util/util');
exports = module.exports = asmNetworkTestUtil;
var retry = 5;

/**
 * @class
 * Initializes a new instance of the asmNetworkTestUtil class.
 * @constructor
 *
 * Example use of this class:
 *
 * //creates mobile test class
 * var vmUtil = new asmNetworkTestUtil();
 * // use the methods
 *
 */
function asmNetworkTestUtil() {
	this.timeout = 3000000;
}
//Start Of Gateway
asmNetworkTestUtil.prototype.createVnetForGateway = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr, location, timeout, suite, callback) {
	var cmd = util.format('network vnet create %s -e %s -i %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		setTimeout(callback, timeout);
	});
};

asmNetworkTestUtil.prototype.createGatewaySubnet = function(vnetPrefix, subnetPrefix, subnetAddressPrefix, timeout, suite, callback) {
	var cmd = util.format('network vnet subnet create -t %s -n %s -a %s --json', vnetPrefix, subnetPrefix, subnetAddressPrefix).split(' ');
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		setTimeout(callback, timeout);
	});
};

asmNetworkTestUtil.prototype.createLocalNetwork = function(localnetworkPrefix, localnetworkAddressPrefix, vpnGatewayAddress, timeout, suite, callback) {
	var cmd = util.format('network local-network create -n %s -a %s -w %s --json', localnetworkPrefix, localnetworkAddressPrefix, vpnGatewayAddress).split(' ');
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		setTimeout(callback, timeout);
	});
};
asmNetworkTestUtil.prototype.addLocalNetwork = function(vnetPrefix, localnetworkPrefix, timeout, suite, callback) {
	var cmd = util.format('network vnet local-network add -n %s -l %s --json', vnetPrefix, localnetworkPrefix).split(' ');
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		setTimeout(callback, timeout);
	});
};
asmNetworkTestUtil.prototype.createStorage = function(storagePrefix, storageLocation, accountType, timeout, suite, callback) {
	var cmd = util.format('storage account create %s --type %s --json',storagePrefix, accountType).split(' ');
	cmd.push('-l');
	cmd.push(storageLocation);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		setTimeout(callback, timeout);
	});
};
asmNetworkTestUtil.prototype.listStorageKey = function(storagePrefix, timeout, suite, callback) {
	var cmd = util.format('storage account keys list %s --json', storagePrefix).split(' ');
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		var storageAccountKeys = JSON.parse(result.text);
		storageAccountKeys.primaryKey.should.not.be.null;
		var primaryKey = storageAccountKeys.primaryKey;
		storageAccountKeys.secondaryKey.should.not.be.null;
		setTimeout(callback(primaryKey), timeout);
	});
};
asmNetworkTestUtil.prototype.createStorageCont = function(storageCont, storagePrefix, primaryKey, timeout, suite, callback) {
	var cmd = util.format('storage container create --container %s -a %s -k %s --json',storageCont, storagePrefix, primaryKey).split(' ');
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		setTimeout(callback, timeout);
	});
};
asmNetworkTestUtil.prototype.deleteLocalNetwork = function(localnetworkPrefix, timeout, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network local-network delete -n %s -q --json', localnetworkPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			setTimeout(callback, timeout);
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.deleteStorage = function(storagePrefix, timeout, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('storage account delete %s -q --json', storagePrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			setTimeout(callback, timeout);
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.deleteGatewayVnet = function(vnetPrefix, timeout, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network vnet delete %s --quiet --json', vnetPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			setTimeout(callback, timeout);
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.removeLocalNetwork = function(vnetPrefix, localnetworkPrefix, timeout, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network vnet local-network remove -n %s -l %s --json', vnetPrefix, localnetworkPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			setTimeout(callback, timeout);
		});
	}
	else callback();
};
//End Of Gateway
asmNetworkTestUtil.prototype.createSubnetVnet = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr, location, suite, callback) {
	var cmd = util.format('network vnet create %s -e %s -i %s -n %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.createVnet = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr, location, timeout, suite, callback) {
	var cmd = util.format('network vnet create %s -e %s -i %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		//callback();
		setTimeout(callback, timeout);
	});
};
asmNetworkTestUtil.prototype.createVnetMin = function(vnetPrefix, subnetPrefix, location, suite, callback) {
	var cmd = util.format('network vnet create --vnet %s -n %s --json', vnetPrefix, subnetPrefix).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.deleteVnet = function(vnetPrefix, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network vnet delete %s --quiet --json', vnetPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.createReservedIp = function(ripName, location, suite, callback) {
	var cmd = util.format('network reserved-ip create %s %s --json', ripName, location);
	suite.execute('network reserved-ip create %s %s --json', ripName, location, function(result) {
		result.exitStatus.should.equal(0);
		cmd = util.format('network reserved-ip show %s --json', ripName);
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	});
};
asmNetworkTestUtil.prototype.deleteRIP = function(ripName, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network reserved-ip delete %s --quiet --json', ripName).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.createNSG = function(nsgPrefix, location, suite, callback) {
	var cmd = util.format('network nsg create %s --json', nsgPrefix).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.deleteNSG = function(nsgPrefix, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network nsg delete %s --quiet --json', nsgPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.createRouteTable = function(rtPrefix, location, suite, callback) {
	var cmd = util.format('network route-table create %s --json', rtPrefix).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.deleteRouteTable = function(rtPrefix, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network route-table delete %s --quiet --json', rtPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.createEmptySubVnet = function(vnetPrefix, subnetPrefix, location, suite, callback) {
	var cmd = util.format('network vnet create --vnet %s -n %s --json', vnetPrefix, subnetPrefix).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.deleteSubnet = function(vnetPrefix,subnetPrefix, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network vnet subnet delete %s --quiet --json', vnetPrefix,subnetPrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else
		callback();
};
asmNetworkTestUtil.prototype.createGateway = function(appGatePrefix, vnetPrefix, subnetPrefix, instanceCount, gatewaySize, description, suite, callback) {
	var cmd = util.format('network application-gateway create -n %s -e %s -t %s -c %s -z %s --json',
		appGatePrefix, vnetPrefix, subnetPrefix, instanceCount, gatewaySize).split(' ');
	cmd.push('-d');
	cmd.push(description);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.deleteGateway = function(appGatePrefix, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('network application-gateway delete %s --quiet --json', appGatePrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	}
	else
		callback();
};
asmNetworkTestUtil.prototype.createService = function(servicePrefix, location, suite, callback) {
	var cmd = util.format('service create %s --json', servicePrefix).split(' ');
	cmd.push('--location');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.deleteService = function(servicePrefix, suite, callback) {
	if (!suite.isPlayback()) {
		var cmd = util.format('service delete %s --quiet --json', servicePrefix).split(' ');
		testUtils.executeCommand(suite, retry, cmd, function(result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else
		callback();
};