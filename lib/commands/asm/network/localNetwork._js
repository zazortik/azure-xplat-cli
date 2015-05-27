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
var network = require('./../network');
var $ = utils.getLocaleString;

function LocalNetwork(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(LocalNetwork.prototype, {
  create: function (localNetworkName, options, _) {
    // TODO
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
    var localNetwork = utils.findFirstCaseIgnore(networkConfig.LocalNetworkSites, {name: networkName});
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
        output.warn(util.format($('A local network with name "%s" not found'), networkName));
      }
    }
  }
});

module.exports = LocalNetwork;