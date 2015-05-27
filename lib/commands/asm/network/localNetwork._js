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
var util = require('util');
var utils = require('../../../util/utils');
var network = require('../network');

var VNetUtil = require('./../../../util/vnet.util');
var $ = utils.getLocaleString;

function LocalNetwork(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(LocalNetwork.prototype, {
  create: function (localNetworkName, options, _) {
    var networkConfig = network.getNetworkConfig(options, _);
    var lNetList = networkConfig.VirtualNetworkConfiguration.LocalNetworkSites;
    if (!lNetList) {
      networkConfig.VirtualNetworkConfiguration.LocalNetworkSites = [];
    }

    var lNet = this._getLNnetByName(lNetList, localNetworkName);
    if (lNet) {
      throw new Error(util.format($('A local network with name "%s" already exists'), localNetworkName));
    }

    var localNetwork = {Name: localNetworkName};
    if (options.addressPrefixes) {
      if (!localNetwork.AddressSpace) {
        localNetwork.AddressSpace = [];
      }

      var vnetUtil = new VNetUtil();
      options.addressPrefixes.split(',').forEach(function (addressPrefix) {
        var ip = addressPrefix.split('/');
        var ipValidated = vnetUtil.parseIPv4(ip[0], '--address-prefixes');
        if (!ipValidated.error && !isNaN(parseInt(ip[1], 10))) {
          localNetwork.AddressSpace.push(addressPrefix);
        } else {
          this.cli.output.warn(util.format($('Local network address prefix "%s" is not valid for local network'), addressPrefix));
        }
      });
    }

    if (options.vpnGatewayAddress) {
      var vpnIpValidated = vnetUtil.parseIPv4(options.vpnGatewayAddress, '--vpn-gateway-address');
      if (!vpnIpValidated.error) {
        localNetwork.VPNGatewayAddress = options.vpnGatewayAddress;
      } else {
        this.cli.output.warn(util.format($('Local network address prefix "%s" is not valid for local network'), options.vpnGatewayAddress));
      }
    }

    networkConfig.VirtualNetworkConfiguration.LocalNetworkSites.push(localNetwork);
    var progress = this.cli.interaction.progress(util.format($('Creating local network "%s"'), localNetworkName));
    try {
      network.setNetworkConfig(options, networkConfig, _);
    } finally {
      progress.end();
    }

    this.show(localNetworkName, options, _);
  },

  set: function (localNetworkName, options, _) {
    var networkConfig = network.getNetworkConfig(options, _);
    var lNetList = networkConfig.VirtualNetworkConfiguration.LocalNetworkSites;
    if (!lNetList) {
      throw new Error($('No virtual network found'), localNetworkName);
    }

    var lNet = this._getLNnetByName(lNetList, localNetworkName);
    if (!lNet) {
      throw new Error(util.format($('A local network with name "%s" not found'), localNetworkName));
    }

    if (options.addressPrefixes) {
      lNet.AddressSpace = [];
      var vnetUtil = new VNetUtil();
      options.addressPrefixes.split(',').forEach(function (addressPrefix) {
        var ip = addressPrefix.split('/');
        var ipValidated = vnetUtil.parseIPv4(ip[0], '--address-prefixes');
        if (!ipValidated.error && parseInt(ip[1], 10) != NaN) {
          lNet.AddressSpace.push(addressPrefix);
        } else {
          this.cli.output.warn(util.format($('Local network address prefix "%s" is not valid for local network'), addressPrefix));
        }
      });
    }

    if (options.vpnGatewayAddress) {
      var vpnIpValidated = vnetUtil.parseIPv4(options.vpnGatewayAddress, '--vpn-gateway-address');
      if (!vpnIpValidated.error) {
        lNet.VPNGatewayAddress = options.vpnGatewayAddress;
      } else {
        this.cli.output.warn(util.format($('Local network address prefix "%s" is not valid for local network'), options.vpnGatewayAddress));
      }
    }

    var progress = this.cli.interaction.progress(util.format($('Updating local network "%s"'), localNetworkName));
    try {
      network.setNetworkConfig(options, networkConfig, _);
    } finally {
      progress.end();
    }
    this.show(localNetworkName, options, _);
  },

  list: function (options, _) {
    var networkConfig = network.getNetworkConfig(options, _);
    networkConfig = networkConfig.VirtualNetworkConfiguration;
    var output = this.cli.output;

    if (!networkConfig.LocalNetworkSites) networkConfig.LocalNetworkSites = [];
    this.cli.interaction.formatOutput(networkConfig.LocalNetworkSites, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No local network sites found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.Name);
          row.cell($('Gateway address'), item.VPNGatewayAddress);
          row.cell($('Address space'), item.AddressSpace[0] || '');
        });
      }
    });
  },

  show: function (networkName, options, _) {
    var networkConfig = network.getNetworkConfig(options, _);
    networkConfig = networkConfig.VirtualNetworkConfiguration;
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (!networkConfig.LocalNetworkSites) networkConfig.LocalNetworkSites = [];
    var localNetwork = utils.findFirstCaseIgnore(networkConfig.LocalNetworkSites, {Name: networkName});
    if (localNetwork) {
      interaction.formatOutput(localNetwork, function (network) {
        output.nameValue($('Name'), network.Name);
        output.nameValue($('Gateway address'), network.VPNGatewayAddress);
        output.header('Address space');
        network.AddressSpace.forEach(function (address) {
          output.nameValue(address, 2);
        });
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
      }
    }
  },

  _getLNnetByName: function (lnetList, vNetName) {
    if (!lnetList) {
      return null;
    }
    for (var i = 0; i < lnetList.length; i++) {
      if (utils.ignoreCaseEquals(lnetList[i].Name, vNetName)) {
        return lnetList[i];
      }
    }
  }
});

module.exports = LocalNetwork;