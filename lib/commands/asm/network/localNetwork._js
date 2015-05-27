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
          row.cell($('Address space'), item.AddressSpace);
          row.cell($('Gateway address'), item.VPNGatewayAddress);
        });
      }
    });
  }
});

module.exports = LocalNetwork;