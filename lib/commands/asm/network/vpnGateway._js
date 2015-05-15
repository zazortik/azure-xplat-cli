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
var $ = utils.getLocaleString;

function VpnGateway(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(VpnGateway.prototype, {

  showVirtualNetworkGateway: function (networkName, options, _) {
    var gateway = this.getVirtualNetworkGateway(networkName, _);
    var output = this.cli.output;

    if (!gateway) {
      if (output.format().json) {
        output.json({});
      } else {
        output.info(util.format($('Gateway "%s" not found for the virtual network "%s"'), networkName));
      }
      return;
    }

    this.cli.interaction.formatOutput(gateway, function (gateway) {
      output.nameValue($('VIP Address'), gateway.vipAddress);
      output.nameValue($('Gateway type'), gateway.gatewayType);
      output.nameValue($('Gateway size'), gateway.gatewaySKU);
      output.nameValue($('State'), gateway.state);
      if (gateway.defaultSite) {
        output.nameValue($('Local network default site name'), gateway.defaultSite.name);
      }
      if (gateway.lastEvent) {
        output.header($('Last event'));
        output.nameValue($('Timestamp'), gateway.lastEvent.timestamp, 2);
        output.nameValue($('ID'), gateway.lastEvent.id, 2);
        output.nameValue($('Message'), gateway.lastEvent.message, 2);
      }
    });
  },

  deleteVirtualNetworkGateway: function (networkName, options, _) {
    var gateway = this.getVirtualNetworkGateway(networkName, _);
    if (!gateway) {
      throw new Error(utils.format($('Gateway not found for the virtual network "%s"'), networkName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete gateway for the virtual network %s? [y/n] '), networkName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting gateway for the virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.deleteMethod(networkName, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  getVirtualNetworkGateway: function (networkName, _) {
    var gateway = null;
    var progress = this.cli.interaction.progress(util.format($('Looking up network gateway in virtual network "%s"'), networkName));
    try {
      gateway = this.networkManagementClient.gateways.get(networkName, _);
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        gateway = null;
      } else {
        throw e;
      }
    } finally {
      progress.end();
    }

    return gateway;
  }
});

module.exports = VpnGateway;