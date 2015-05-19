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
        output.nameValue($('Data'), gateway.lastEvent.data, 2);
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
  },

  listConnections: function (networkName, options, _) {
    var progress = this.cli.interaction.progress($('Getting the network connections'));
    var connectionList = null;
    try {
      connectionList = this.networkManagementClient.gateways.listConnections(networkName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(connectionList.connections, function (outputData) {
      if (outputData || outputData.length === 0) {
        output.warn($('No network security groups found'));
      } else {
        var indent = 0;
        output.header('Connections', indent, true);

        indent += 2;
        var counter = 0;
        outputData.forEach(function (item) {
          output.header(util.format($('Connection %s', counter)), indent);
          indent += 2;
          output.nameValue('Local network site name', item.localNetworkSiteName, indent);
          output.nameValue('State', item.connectivityState, indent);
          output.nameValue('Bytes of data transferred in', item.ingressBytesTransferred, indent);
          output.nameValue('Bytes of data transferred out', item.egressBytesTransferred, indent);
          output.nameValue('Last connection established', item.lastConnectionEstablished, indent);

          if (item.allocatedIpAddresses) {
            output.list('VPN Client IP Addresses', item.allocatedIpAddresses, indent);
          }

          if (item.lastEvent) {
            output.nameValue('Last event ID', item.lastEvent.id, indent);
            output.nameValue('Last event message', item.lastEvent.message, indent);
            output.nameValue('Last event timestamp', item.lastEvent.timestamp, indent);
          }
          indent -= 2;
        });
      }
    });
  }
});

module.exports = VpnGateway;