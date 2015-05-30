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
var AppGateway = require('./appGateway');

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
    localNetwork.addAssociation(virtualNetworkName, localNetworkName, options, _);
  },

  removeAssociationBetweenLocalNetworkAndVirtualNetwork: function (virtualNetworkName, localNetworkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var localNetwork = new LocalNetwork(this.cli, networkManagementClient);
    localNetwork.removeAssociation(virtualNetworkName, localNetworkName, options, _);
  },

  createVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.create(networkName, options, _);
  },

  showVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.show(networkName, options, _);
  },

  deleteVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.delete(networkName, options, _);
  },

  resizeVirtualNetworkGateway: function (networkName, sku, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.resize(networkName, sku, options, _);
  },

  resetVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.reset(networkName, options, _);
  },

  setDefaultSiteForVirtualNetworkGateway: function (networkName, siteName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.setDefaultSite(networkName, siteName, options, _);
  },

  removeDefaultSiteForVirtualNetworkGateway: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.removeDefaultSite(networkName, options, _);
  },

  listVpnGatewayConnections: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.listConnections(networkName, options, _);
  },

  createRouteTable: function (routeTableName, location, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.create(routeTableName, location, options, _);
  },

  showRouteTable: function (routeTableName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.show(routeTableName, options, _);
  },

  listRouteTables: function (options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.list(options, _);
  },

  deleteRouteTable: function (routeTableName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.delete(routeTableName, options, _);
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

  setRoute: function (routeTableName, routeName, addressPrefix, nextHopType, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.setRoute(routeTableName, routeName, addressPrefix, nextHopType, options, _);
  },

  deleteRoute: function (routeTableName, routeName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var routeTable = new RouteTable(this.cli, networkManagementClient);
    routeTable.deleteRoute(routeTableName, routeName, options, _);
  },

  setSharedKey: function (vnetName, keyValue, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.setSharedKey(vnetName, keyValue, options, _);
  },

  resetSharedKey: function (vnetName, keyLength, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.resetSharedKey(vnetName, keyLength, options, _);
  },

  listVpnDevices: function (options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.listVpnDevices(options, _);
  },

  getScriptForVpnDevice: function (vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.getScriptForVpnDevice(vnetName, options, _);
  },

  startVpnDiagnosticsSession: function (vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.startVpnDiagnosticsSession(vnetName, options, _);
  },

  stopVpnDiagnosticsSession: function (vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.stopVpnDiagnosticsSession(vnetName, options, _);
  },

  getVpnDiagnosticsSession: function (vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.getVpnDiagnosticsSession(vnetName, options, _);
  },

  createApplicationGateway: function(appGatewayName, vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.create(appGatewayName, vnetName, options, _);
  },

  setApplicationGateway: function(appGatewayName, vnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.set(appGatewayName, vnetName, options, _);
  },

  showApplicationGateway: function(appGatewayName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.show(appGatewayName, options, _);
  },

  deleteApplicationGateway: function(appGatewayName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.delete(appGatewayName, options, _);
  },

  startApplicationGateway: function(appGatewayName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.start(appGatewayName, options, _);
  },

  stopApplicationGateway: function(appGatewayName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.stop(appGatewayName, options, _);
  },

  addSslToApplicationGateway: function(appGatewayName, certName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.addSsl(appGatewayName, certName, options, _);
  },

  removeSslFromApplicationGateway: function(appGatewayName, certName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var appGateway = new AppGateway(this.cli, networkManagementClient);
    appGateway.removeSsl(appGatewayName, certName, options, _);
  },

  _createNetworkManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createNetworkClient(subscription);
  }
});

module.exports = NetworkClient;