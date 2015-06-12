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
}

asmNetworkTestUtil.prototype.createSubnetVnet = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr, location, suite, callback) {
	var cmd = util.format('network vnet create %s -e %s -i %s -n %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr).split(' ');
	cmd.push('-l');
	cmd.push(location);
	testUtils.executeCommand(suite, retry, cmd, function(result) {
		result.exitStatus.should.equal(0);
		callback();
	});
};
asmNetworkTestUtil.prototype.createVnet = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr, location, suite, callback) {
	var cmd = util.format('network vnet create %s -e %s -i %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr).split(' ');
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
