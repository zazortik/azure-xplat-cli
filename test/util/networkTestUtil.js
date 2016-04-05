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
var _ = require('underscore');

var testUtils = require('../util/util');
var tagUtils = require('../../lib/commands/arm/tag/tagUtils');
var retry = 5;

/**
 * @class
 * Initializes a new instance of the NetworkTestUtil class.
 * @constructor
 */
function NetworkTestUtil() {
  this.timeout = 800000;

  this.tags = 'tag1=aaa;tag2=bbb';
  this.newTags = 'tag3=ccc';
  this.stateSucceeded = 'Succeeded';
}

_.extend(NetworkTestUtil.prototype, {
  /**
   * Networking
   */
  createGroup: function (groupName, location, suite, callback) {
    var cmd = util.format('group create %s --location %s --json', groupName, location);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var resGroup = JSON.parse(result.text);
      resGroup.name.should.equal(groupName);
      callback(resGroup);
    });
  },
  deleteGroup: function (groupName, suite, callback) {
    if (!suite.isPlayback()) {
      var cmd = util.format('group delete %s --quiet --json', groupName);
      testUtils.executeCommand(suite, retry, cmd, function (result) {
        result.exitStatus.should.equal(0);
        callback();
      });
    } else callback();
  },
  createRouteTable: function (groupName, routeTableName, location, suite, callback) {
    var cmd = util.format('network route-table create -g %s -n %s -l %s --json', groupName, routeTableName, location);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var routeTable = JSON.parse(result.text);
      routeTable.name.should.equal(routeTableName);
      callback(routeTable);
    });
  },
  deleteRouteTable: function (groupName, routeTableName, suite, callback) {
    if (!suite.isPlayback()) {
      var cmd = util.format('network route-table delete -g %s -n %s -q --json', groupName, routeTableName);
      testUtils.executeCommand(suite, retry, cmd, function (result) {
        result.exitStatus.should.equal(0);
        callback();
      });
    } else callback();
  },
  createVnet: function (groupName, vnetName, location, addressPrefix, suite, callback) {
    var cmd = util.format('network vnet create -g %s -n %s -l %s -a %s --json', groupName, vnetName, location, addressPrefix);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var vnet = JSON.parse(result.text);
      vnet.name.should.equal(vnetName);
      callback(vnet);
    });
  },
  deleteVnet: function (groupName, vnetName, suite, callback) {
    if (!suite.isPlayback()) {
      var cmd = util.format('network vnet delete -g %s -n %s --quiet --json', groupName, vnetName);
      testUtils.executeCommand(suite, retry, cmd, function (result) {
        result.exitStatus.should.equal(0);
        callback();
      });
    } else callback();
  },
  createSubnet: function (groupName, vnetName, subnetName, addressPrefix, suite, callback) {
    var cmd = util.format('network vnet subnet create -g %s -e %s -n %s -a %s --json', groupName, vnetName, subnetName, addressPrefix);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var subnet = JSON.parse(result.text);
      subnet.name.should.equal(subnetName);
      callback(subnet);
    });
  },
  createPublicIp: function (groupName, publicIpName, location, suite, callback) {
    var allocation = 'Dynamic', idleTimeout = 4;
    var cmd = util.format('network public-ip create -g %s -n %s -l %s -a %s -i %s --json',
      groupName, publicIpName, location, allocation, idleTimeout);

    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var ip = JSON.parse(result.text);
      ip.name.should.equal(publicIpName);
      callback(ip);
    });
  },
  createNSG: function (groupName, nsgName, location, suite, callback) {
    var cmd = util.format('network nsg create -g %s -n %s -l %s --json', groupName, nsgName, location);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var nsg = JSON.parse(result.text);
      nsg.name.should.equal(nsgName);
      callback(nsg);
    });
  },
  createLB: function (groupName, lbName, location, suite, callback) {
    var cmd = util.format('network lb create -g %s -n %s -l %s --json', groupName, lbName, location);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var lb = JSON.parse(result.text);
      lb.name.should.equal(lbName);
      callback(lb);
    });
  },
  deleteLB: function (groupName, lbName, suite, callback) {
    if (!suite.isPlayback()) {
      var cmd = util.format('network lb delete -g %s -n %s --quiet --json', groupName, lbName);
      testUtils.executeCommand(suite, retry, cmd, function (result) {
        result.exitStatus.should.equal(0);
        callback();
      });
    } else callback();
  },
  createFIP: function (groupName, lbName, fipName, publicIpId, suite, callback) {
    var cmd = util.format('network lb frontend-ip create -g %s -l %s -n %s -u %s --json', groupName, lbName, fipName, publicIpId);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var fip = JSON.parse(result.text);
      fip.name.should.equal(fipName);
      callback(fip);
    });
  },
  createAddressPool: function (groupName, lbName, poolName, suite, callback) {
    var cmd = util.format('network lb address-pool create -g %s -l %s -n %s --json', groupName, lbName, poolName);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var pool = JSON.parse(result.text);
      pool.name.should.equal(poolName);
      callback(pool);
    });
  },
  createProbe: function (groupName, lbName, probeName, port, protocol, suite, callback) {
    var cmd = util.format('network lb probe create -g %s -l %s -n %s -o %s -p %s --json', groupName, lbName, probeName, port, protocol);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var probe = JSON.parse(result.text);
      probe.name.should.equal(probeName);
      callback(probe);
    });
  },
  createInboundNatRule: function (groupName, lbName, ruleName, protocol, frontPort, backPort, enableIp, idleTimeout, fipName, suite, callback) {
    var cmd = util.format('network lb inbound-nat-rule create -g %s -l %s -n %s -p %s -f %s -b %s -e %s -i %s -t %s --json',
      groupName, lbName, ruleName, protocol, frontPort, backPort, enableIp, idleTimeout, fipName);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var rule = JSON.parse(result.text);
      rule.name.should.equal(ruleName);
      callback(rule);
    });
  },
  createExpressRoute: function (groupName, expressRCPrefix, location, serviceProvider, peeringLocation, skuTier, skuFamily, tags1, suite, callback) {
    var cmd = util.format('network express-route circuit create %s %s %s -p %s -i %s -b 50 -e %s -f %s -t %s --json', groupName, expressRCPrefix, location, serviceProvider, peeringLocation, skuTier, skuFamily, tags1).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  },
  createVpnGateway: function (gatewayProp, suite, callback) {
    var self = this;

    self.createVnet(gatewayProp.group, gatewayProp.vnetName, gatewayProp.location, gatewayProp.vnetAddressPrefix, suite, function (vnet) {
      self.createSubnet(gatewayProp.group, gatewayProp.vnetName, gatewayProp.subnetName, gatewayProp.subnetAddressPrefix, suite, function (subnet) {
        self.createPublicIp(gatewayProp.group, gatewayProp.publicIpName, gatewayProp.location, suite, function (publicIp) {
          var cmd = 'network vpn-gateway create -g {group} -n {name} -l {location} -w {gatewayType} -y {vpnType} -k {sku} -a {privateIpAddress} -b {enableBgp} -t {tags} -u {1} -f {2} --json'
            .formatArgs(gatewayProp, publicIp.id, subnet.id);

          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var vpnGateway = JSON.parse(result.text);
            vpnGateway.name.should.equal(gatewayProp.name);
            vpnGateway.gatewayType.should.equal(gatewayProp.gatewayType);
            vpnGateway.vpnType.should.equal(gatewayProp.vpnType);
            vpnGateway.sku.name.should.equal(gatewayProp.sku);
            vpnGateway.enableBgp.should.equal(gatewayProp.enableBgp);
            vpnGateway.ipConfigurations.length.should.equal(1);
            var ipConfig = vpnGateway.ipConfigurations[0];
            ipConfig.privateIPAddress.should.equal(gatewayProp.privateIpAddress);
            ipConfig.subnet.id.should.equal(subnet.id);
            ipConfig.publicIPAddress.id.should.equal(publicIp.id);
            self.shouldHaveTags(vpnGateway);
            self.shouldBeSucceeded(vpnGateway);

            callback(vpnGateway);
          });
        });
      });
    });
  },
  createLocalGateway: function (gatewayProp, suite, callback) {
    var cmd = 'network local-gateway create -g {group} -n {name} -l {location} -a {addressPrefix} -i {gatewayIpAddress} -t {tags} --json'
      .formatArgs(gatewayProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var gateway = JSON.parse(result.text);
      gateway.name.should.equal(gatewayProp.name);
      callback(gateway);
    });
  },

  /**
   * DNS & TrafficManager
   */
  createDnsZone: function (zoneProp, suite, callback) {
    var cmd = 'network dns zone create -g {group} -n {name} -t {tags} --json'.formatArgs(zoneProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var zone = JSON.parse(result.text);
      zone.name.should.equal(zoneProp.name);
      callback(zone);
    });
  },
  createDnsRecordSet: function (rsetProp, suite, callback) {
    var self = this;
    var cmd = 'network dns record-set create -g {group} -z {zoneName} -n {name} -y {type} -l {ttl} -t {tags} --json'.formatArgs(rsetProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var rset = JSON.parse(result.text);
      rset.name.should.equal(rsetProp.name);
      self.shouldHaveTags(rset);
      callback();
    });
  },
  showDnsRecordSet: function (rsetProp, suite, callback) {
    var cmd = 'network dns record-set show -g {group} -z {zoneName} -n {name} -y {type} --json'.formatArgs(rsetProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var rset = JSON.parse(result.text);
      callback(rset);
    });
  },
  listDnsRecordSets: function (zoneProp, suite, callback) {
    var cmd = 'network dns record-set list -g {group} -z {name} --json'.formatArgs(zoneProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var rsets = JSON.parse(result.text);
      callback(rsets);
    });
  },
  deleteDnsRecordSet: function (rsetProp, suite, callback) {
    var self = this;
    var cmd = 'network dns record-set delete -g {group} -z {zoneName} -n {name} -y {type} --quiet --json'.formatArgs(rsetProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);

      self.showDnsRecordSet(rsetProp, suite, function (rset) {
        rset.should.be.empty;
        callback();
      });
    });
  },
  addDnsRecord: function (rsetProp, suite, callback) {
    var cmd = 'network dns record-set add-record -g {group} -z {zoneName} -n {name} -y {type} {params} --json'.formatArgs(rsetProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var rset = JSON.parse(result.text);
      rset.name.should.equal(rsetProp.name);
      callback(rset);
    });
  },
  deleteDnsRecord: function (rsetProp, suite, callback) {
    var cmd = 'network dns record-set delete-record -g {group} -z {zoneName} -n {name} -y {type} {params} --quiet --json'.formatArgs(rsetProp);
    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  },
  createTrafficManagerProfile: function (profileProp, suite, callback) {
    var cmd = 'network traffic-manager profile create -g {group} -n {name} -u {profileStatus} -m {trafficRoutingMethod} -r {relativeDnsName} -l {ttl} -p {monitorProtocol} -o {monitorPort} -a {monitorPath} -t {tags} --json'
      .formatArgs(profileProp);

    testUtils.executeCommand(suite, retry, cmd, function (result) {
      result.exitStatus.should.equal(0);
      var profile = JSON.parse(result.text);
      profile.name.should.equal(profileProp.name);
      profile.properties.profileStatus.should.equal(profileProp.profileStatus);
      profile.properties.trafficRoutingMethod.should.equal(profileProp.trafficRoutingMethod);
      profile.properties.dnsConfig.relativeName.should.equal(profileProp.relativeDnsName);
      profile.properties.dnsConfig.ttl.should.equal(profileProp.ttl);
      profile.properties.monitorConfig.protocol.should.equal(profileProp.monitorProtocol);
      profile.properties.monitorConfig.port.should.equal(profileProp.monitorPort);
      profile.properties.monitorConfig.path.should.equal(profileProp.monitorPath);
      callback(profile);
    });
  },
  stopAppGateway: function(groupName, appGatewayPrefix, suite, callback) {
    var cmd = util.format('network application-gateway stop %s %s --json', groupName, appGatewayPrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  },

  /**
   * Assertions
   */
  shouldHaveTags: function (obj) {
    tagUtils.getTagsInfo(obj.tags).should.equal(this.tags);
  },
  shouldAppendTags: function (obj) {
    var pattern = this.tags + ';' + this.newTags;
    tagUtils.getTagsInfo(obj.tags).should.equal(pattern);
  },
  shouldBeSucceeded: function (obj) {
    obj.provisioningState.should.equal(this.stateSucceeded);
  }
});

module.exports = NetworkTestUtil;