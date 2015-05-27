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

var __ = require('underscore');
var utils = require('../../../util/utils');
var profile = require('../../../util/profile');

var LocalNetwork = require('./localNetwork');
var Nsg = require('./nsg');
var RouteTable = require('./routeTable');
var Subnet = require('./subnet');
var LocalNetwork = require('./localNetwork');
var VpnGateway = require('./vpnGateway');

function NetworkClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
}

__.extend(NetworkClient.prototype, {

  createNSG: function (name, location, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.create(name, location, options, _);
  },

  listNSGs: function (options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.list(options, _);
  },

  showNSG: function (name, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.show(name, options, _);
  },

  deleteNSG: function (name, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.delete(name, options, _);
  },

  createNsgRule: function (nsgName, ruleName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.createNsgRule(nsgName, ruleName, options, _);
  },

  setNsgRule: function (nsgName, ruleName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.setNsgRule(nsgName, ruleName, options, _);
  },

  listNsgRules: function (nsgName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.listNsgRules(nsgName, options, _);
  },

  showNsgRule: function (nsgName, ruleName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.showNsgRule(nsgName, ruleName, options, _);
  },

  deleteNsgRule: function (nsgName, ruleName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var nsg = new Nsg(this.cli, networkManagementClient);
    nsg.deleteNsgRule(nsgName, ruleName, options, _);
  },

  addNsgToSubnet: function (nsgName, vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.addNsgToSubnet(nsgName, vnetName, subnetName, options, _);
  },

  removeNsgFromSubnet: function (nsgName, vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.removeNsgFromSubnet(nsgName, vnetName, subnetName, options, _);
  },

  createSubnet: function (vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.create(vnetName, subnetName, options, _);
  },

  setSubnet: function (vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.set(vnetName, subnetName, options, _);
  },

  listSubnets: function (vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.list(vnetName, options, _);
  },

  showSubnet: function (vnetName, name, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.show(vnetName, name, options, _);
  },

  deleteSubnet: function (vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.delete(vnetName, subnetName, options, _);
  },

  addRouteTableToSubnet: function (vnetName, subnetName, routeTableName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.addRouteTableToSubnet(vnetName, subnetName, routeTableName, options, _);
  },

  deleteRouteTableFromSubnet: function (vnetName, subnetName, routeTableName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.deleteRouteTableFromSubnet(vnetName, subnetName, routeTableName, options, _);
  },

  showRouteTableForSubnet: function (vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.showRouteTableForSubnet(vnetName, subnetName, options, _);
  },

  createLocalNetwork: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.create(networkName, options, _);
  },

  setLocalNetwork: function (localNetworkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.set(localNetworkName, options, _);
  },

  listLocalNetworks: function (options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.list(options, _);
  },

  showLocalNetwork: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.show(networkName, options, _);
  },

  deleteLocalNetwork: function (name, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.delete(name, options, _);
  },

  associateLocalNetworkWithVirtualNetwork: function (virtualNetworkName, localNetworkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.add(virtualNetworkName, localNetworkName, options, _);
  },

  removeAssociationBetweenLocalNetworkAndVirtualNetwork: function (virtualNetworkName, localNetworkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.remove(virtualNetworkName, localNetworkName, options, _);
  },

  showVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.showVirtualNetworkGateway(networkName, options, _);
  },

  deleteVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.deleteVirtualNetworkGateway(networkName, options, _);
  },

  listVpnGatewayConnections: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.listVpnGatewayConnections(networkName, options, _);
  },


  _createNetworkManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createNetworkClient(subscription);
  }
});

module.exports = NetworkClient;