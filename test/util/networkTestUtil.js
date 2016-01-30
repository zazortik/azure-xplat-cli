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
}

networkTestUtil.prototype.createGroup = function(groupName, location, suite, callback) {
  var cmd = util.format('group create %s --location %s --json', groupName, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.deleteUsedGroup = function(groupName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('group delete %s --quiet --json', groupName).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else callback();
};
networkTestUtil.prototype.createRouteTable = function(groupName, RouteTablePrefix, location, suite, callback) {
  var cmd = util.format('network route-table create -g %s -n %s -l %s --json', groupName, RouteTablePrefix, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
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
networkTestUtil.prototype.createRouteTable = function(groupName, RouteTablePrefix, location, suite, callback) {
  var cmd = util.format('network route-table create -g %s -n %s -l %s --json', groupName, RouteTablePrefix, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
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
networkTestUtil.prototype.createVnet = function(groupName, vnetPrefix, location, suite, callback) {
  var cmd = util.format('network vnet create %s %s %s -a 10.0.0.0/8 --json', groupName, vnetPrefix, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createSubnet = function(groupName, vnetPrefix, subnetprefix, suite, callback) {
  var cmd = util.format('network vnet subnet create %s %s %s -a 10.0.0.0/24 --json', groupName, vnetPrefix, subnetprefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.showSubnet = function(groupName, vnetPrefix, subnetprefix, suite, callback) {
  var cmd = util.format('network vnet subnet show %s %s %s --json ', groupName, vnetPrefix, subnetprefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var allResources = JSON.parse(result.text);
    networkTestUtil.subnetId = allResources.id;
    callback();
  });
};
networkTestUtil.prototype.createPublicIp = function(groupName, publicipPrefix, location, suite, callback) {
  var cmd = util.format('network public-ip create %s %s --location %s --json', groupName, publicipPrefix, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createPublicIpdns = function(groupName, publicipPrefix, location, suite, callback) {
  var cmd = util.format('network public-ip create %s %s --location %s -d %s --json', groupName, publicipPrefix, location, publicipPrefix).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
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
  var cmd = util.format('network nsg create %s %s %s --json', groupName, nsgName, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.showNSG = function(groupName, nsgName, suite, callback) {
  var cmd = util.format('network nsg show %s %s --json', groupName, nsgName).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var allResources = JSON.parse(result.text);
    networkTestUtil.nsgId = allResources.id;
    callback();
  });
};
networkTestUtil.prototype.createLB = function(groupName, LBName, location, suite, callback) {
  var cmd = util.format('network lb create %s %s %s --json', groupName, LBName, location).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createFrontendIp = function(groupName, LBName, FrontendIpName, publicIpId, suite, callback) {
  var cmd = util.format('network lb frontend-ip create %s %s %s -u %s --json', groupName, LBName, FrontendIpName, publicIpId).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createLbInboundNatRule = function(groupName, LBName, lbinboundprefix, protocol, frontendport, backendport, enablefloatingip, FrontendIpName, suite, callback) {
  var cmd = util.format('network lb inbound-nat-rule create %s %s %s -p %s -f %s -b %s -e %s -i 4 -t %s --json', groupName, LBName, lbinboundprefix, protocol, frontendport, backendport, enablefloatingip, FrontendIpName).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.createLbAddressPool = function(groupName, LBName, LBAddPool, suite, callback) {
  var cmd = util.format('network lb address-pool create -g %s -l %s %s --json', groupName, LBName, LBAddPool).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
networkTestUtil.prototype.showLB = function(groupName, LBName, suite, callback) {
  var cmd = util.format('network lb show %s %s --json', groupName, LBName).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var allResources = JSON.parse(result.text);
    networkTestUtil.lbaddresspoolId = allResources.backendAddressPools[0].id;
    networkTestUtil.lbinboundruleId = allResources.inboundNatRules[0].id;

    if (allResources.backendAddressPools[1] != undefined) {
      networkTestUtil.lbaddresspoolId2 = allResources.backendAddressPools[1].id;
    }
    if (allResources.inboundNatRules[1] != undefined) {
      networkTestUtil.lbinboundruleId2 = allResources.inboundNatRules[1].id;
    }
    callback();
  });
};
networkTestUtil.prototype.deleteUsedLB = function(groupName, LBName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network lb delete %s %s --quiet --json', groupName, LBName).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
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
networkTestUtil.prototype.deleteUsedPublicIp = function(groupName, publicipPrefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network public-ip delete %s %s --quiet --json', groupName, publicipPrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.deleteUsedNsg = function(groupName, nsgName, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network nsg delete %s %s --quiet --json', groupName, nsgName).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
networkTestUtil.prototype.deleteUsedVnet = function(groupName, vnetPrefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network vnet delete %s %s --quiet --json', groupName, vnetPrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
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
networkTestUtil.prototype.createLBProbe = function(groupName, LBName, LBProbe, suite, callback) {
  var cmd = util.format('network lb probe create %s %s %s --json', groupName, LBName, LBProbe).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
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