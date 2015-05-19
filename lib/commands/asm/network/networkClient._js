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

var Nsg = require('./nsg');
var Subnet = require('./subnet');
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

  addNsgToSubnet: function (nsgName, vNetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.addNsgToSubnet(nsgName, vNetName, subnetName, options, _);
  },

  removeNsgFromSubnet: function (nsgName, vNetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.removeNsgFromSubnet(nsgName, vNetName, subnetName, options, _);
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

  showSubnet: function (vNetName, name, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.show(vNetName, name, options, _);
  },

  deleteSubnet: function (vnetName, subnetName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);

    var subnet = new Subnet(this.cli, networkManagementClient);
    subnet.delete(vnetName, subnetName, options, _);
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

  listConnections: function (networkName, options, _) {
    var networkManagementClient = this._createNetworkManagementClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkManagementClient);
    vpnGateway.listConnections(networkName, options, _);
  },

  _createNetworkManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createNetworkClient(subscription);
  }
});

module.exports = NetworkClient;