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
var util = require('util');
var testUtils = require('../util/util');
var tagUtils = require('../../lib/commands/arm/tag/tagUtils');
exports = module.exports = networkTestUtil;
var retry = 5;

/**
 * @class
 * Initializes a new instance of the networkTestUtil class.
 * @constructor
 *
 * Example use of this class:
 *
 * //creates mobile test class
 * var networkUtil = new networkTestUtil();
 * // use the methods
 *
 */
function networkTestUtil() {
  this.subnetId = '';
  this.publicIpId = '';
  this.lbaddresspoolId = '';
  this.lbinboundruleId = '';
  this.lbaddresspoolId2 = '';
  this.lbinboundruleId2 = '';
  this.nsgId = '';
  this.reversefqdn1 = '';
  this.reversefqdn = '';
  this.timeout = 800000;
  this.gatewaytimeout = 3500000;

  this.tags = 'tag1=aaa;tag2=bbb';
  this.newTags = 'tag3=ccc';
  this.stateSucceeded = 'Succeeded';
}

networkTestUtil.prototype.createGroup = function(groupName, location, suite, callback) {
  var cmd = util.format('group create %s --location %s --json', groupName, location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var resGroup = JSON.parse(result.text);
    resGroup.name.should.equal(groupName);
    callback(resGroup);
  });
};
networkTestUtil.prototype.deleteGroup = function(groupName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('group delete %s --quiet --json', groupName);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.createRouteTable = function(groupName, routeTableName, location, suite, callback) {
  var cmd = util.format('network route-table create -g %s -n %s -l %s --json', groupName, routeTableName, location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var routeTable = JSON.parse(result.text);
    routeTable.name.should.equal(routeTableName);
    callback(routeTable);
  });
};
networkTestUtil.prototype.deleteRouteTable = function(groupName, routeTableName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network route-table delete -g %s -n %s -q --json', groupName, routeTableName);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.deleteRouteTable = function(groupName, RouteTablePrefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network route-table delete -g %s -n %s -q --json', groupName, RouteTablePrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.createVnet = function(groupName, vnetName, location, addressPrefix, suite, callback) {
  var cmd = util.format('network vnet create -g %s -n %s -l %s -a %s --json', groupName, vnetName, location, addressPrefix);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var vnet = JSON.parse(result.text);
    vnet.name.should.equal(vnetName);
    callback(vnet);
  });
};
networkTestUtil.prototype.createSubnet = function(groupName, vnetName, subnetName, addressPrefix, suite, callback) {
  var cmd = util.format('network vnet subnet create -g %s -e %s -n %s -a %s --json', groupName, vnetName, subnetName, addressPrefix);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var subnet = JSON.parse(result.text);
    subnet.name.should.equal(subnetName);
    callback(subnet);
  });
};
networkTestUtil.prototype.createPublicIp = function(groupName, publicIpName, location, suite, callback) {
  var allocation = 'Dynamic', idleTimeout = 4;
  var cmd = util.format('network public-ip create -g %s -n %s -l %s -a %s -i %s --json',
    groupName, publicIpName, location, allocation, idleTimeout);

  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var ip = JSON.parse(result.text);
    ip.name.should.equal(publicIpName);
    callback(ip);
  });
};
networkTestUtil.prototype.showPublicIp = function(groupName, publicipPrefix, suite, callback) {
  var cmd = util.format('network public-ip show %s %s --json', groupName, publicipPrefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var allResources = JSON.parse(result.text);
    networkTestUtil.publicIpId = allResources.id;
    callback();
  });
};
networkTestUtil.prototype.createNSG = function(groupName, nsgName, location, suite, callback) {
  var cmd = util.format('network nsg create -g %s -n %s -l %s --json', groupName, nsgName, location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var nsg = JSON.parse(result.text);
    nsg.name.should.equal(nsgName);
    callback(nsg);
  });
};
networkTestUtil.prototype.createLB = function(groupName, lbName, location, suite, callback) {
  var cmd = util.format('network lb create -g %s -n %s -l %s --json', groupName, lbName, location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var lb = JSON.parse(result.text);
    lb.name.should.equal(lbName);
    callback(lb);
  });
};
networkTestUtil.prototype.createFIP = function(groupName, lbName, fipName, publicIpId, suite, callback) {
  var cmd = util.format('network lb frontend-ip create -g %s -l %s -n %s -u %s --json', groupName, lbName, fipName, publicIpId);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var fip = JSON.parse(result.text);
    fip.name.should.equal(fipName);
    callback(fip);
  });
};
networkTestUtil.prototype.createAddressPool = function(groupName, lbName, poolName, suite, callback) {
  var cmd = util.format('network lb address-pool create -g %s -l %s -n %s --json', groupName, lbName, poolName);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var pool = JSON.parse(result.text);
    pool.name.should.equal(poolName);
    callback(pool);
  });
};
networkTestUtil.prototype.createProbe = function(groupName, lbName, probeName, port, protocol, suite, callback) {
  var cmd = util.format('network lb probe create -g %s -l %s -n %s -o %s -p %s --json', groupName, lbName, probeName, port, protocol);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var probe = JSON.parse(result.text);
    probe.name.should.equal(probeName);
    callback(probe);
  });
};
networkTestUtil.prototype.createInboundNatRule = function(groupName, lbName, ruleName, protocol, frontPort, backPort, enableIp, idleTimeout, fipName, suite, callback) {
  var cmd = util.format('network lb inbound-nat-rule create -g %s -l %s -n %s -p %s -f %s -b %s -e %s -i %s -t %s --json',
    groupName, lbName, ruleName, protocol, frontPort, backPort, enableIp, idleTimeout, fipName);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var rule = JSON.parse(result.text);
    rule.name.should.equal(ruleName);
    callback(rule);
  });
};

networkTestUtil.prototype.deleteLB = function(groupName, lbName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network lb delete -g %s -n %s --quiet --json', groupName, lbName);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.deleteUsedSubnet = function(groupName, vnetPrefix, subnetprefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network vnet subnet delete %s %s %s --quiet --json', groupName, vnetPrefix, subnetprefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.deletePublicIp = function(groupName, publicIpName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network public-ip delete -g %s -n %s --quiet --json', groupName, publicIpName);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.deleteNsg = function(groupName, nsgName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network nsg delete -g %s -n %s --quiet --json', groupName, nsgName);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.deleteVnet = function(groupName, vnetName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network vnet delete -g %s -n %s --quiet --json', groupName, vnetName);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.deleteLBProbe = function(groupName, LBName, LBProbe, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network lb probe delete %s %s %s --quiet --json', groupName, LBName, LBProbe).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.deleteLBAddPool = function(groupName, LBName, LBAddPool, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network lb address-pool delete %s %s %s -q --json', groupName, LBName, LBAddPool).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.deleteUsedNic = function(groupName, NicName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network nic delete %s %s --quiet --json', groupName, NicName).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.createDnszone = function(groupName, dnszonePrefix, suite, callback) {
  var cmd = util.format('network dns zone create %s %s --json', groupName, dnszonePrefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createDnszone = function(groupName, dnszonePrefix, suite, callback) {
  var cmd = util.format('network dns zone create %s %s --json', groupName, dnszonePrefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.deleteUsedDns = function(groupName, dnszonePrefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network dns zone delete %s %s --quiet --json', groupName, dnszonePrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.createTrafficManagerProfile = function(groupName, trafficMPPrefix, profile_status, routing_method, reldns, time_to_live, monitor_protocol, monitor_port, monitor_path, suite, callback) {
  var cmd = util.format('network traffic-manager profile create %s %s -u %s -m %s -r %s -l %s -p %s -o %s -a %s --json', groupName, trafficMPPrefix, profile_status, routing_method, reldns, time_to_live, monitor_protocol, monitor_port, monitor_path).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createVnetWithAddress = function(groupName, vnetPrefix, location, vnetAddressPrefix, suite, callback) {
  var cmd = util.format('network vnet create %s %s %s -a %s --json', groupName, vnetPrefix, location, vnetAddressPrefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createSubnetWithAddress = function(groupName, vnetPrefix, subnetprefix, subnetAddressPrefix, suite, callback) {
  var cmd = util.format('network vnet subnet create %s %s %s -a %s --json', groupName, vnetPrefix, subnetprefix, subnetAddressPrefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createGateway = function(groupName, gatewayPrefix, location, type, publicipPrefix, vnetPrefix, subnetprefix, privateIpAddress, enablebgp, tags, suite, callback) {
  var cmd = util.format('network vpn-gateway create -g %s -n %s -l %s -y %s -p %s -m %s -e %s -a %s -b %s -t %s --json', groupName, gatewayPrefix, location, type, publicipPrefix, vnetPrefix, subnetprefix, privateIpAddress, enablebgp, tags).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createExpressRoute = function(groupName, expressRCPrefix, location, serviceProvider, peeringLocation, skuTier, skuFamily, tags1, suite, callback) {
  var cmd = util.format('network express-route circuit create %s %s %s -p %s -i %s -b 50 -e %s -f %s -t %s --json', groupName, expressRCPrefix, location, serviceProvider, peeringLocation, skuTier, skuFamily, tags1).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};

networkTestUtil.prototype.shouldAppendTags = function (obj) {
  var pattern = this.tags + ';' + this.newTags;
  tagUtils.getTagsInfo(obj.tags).should.equal(pattern);
};

networkTestUtil.prototype.shouldBeSucceeded = function (obj) {
  obj.provisioningState.should.equal(this.stateSucceeded);
};